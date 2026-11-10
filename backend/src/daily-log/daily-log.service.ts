import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  getDateOnlyDayBounds,
  getDateOnlyRangeBounds,
  parseDateOnlyString,
  toDateOnlyString,
} from '../common/utils/date-only';
import { CreateDailyLogEntryDto } from './dto/create-daily-log-entry.dto';
import { UpdateDailyLogEntryDto } from './dto/update-daily-log-entry.dto';
import type { CreateFromReservationDto } from './dto/create-from-reservation.dto';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { IncomeSyncService } from '../finance/income-sync.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { NotificationsService } from '../notifications/notifications.service';
import { buildDebtCopy } from '../notifications/utils/reservation-push-copy';
import { assertReservationTransition } from '../reservations/assert-reservation-transition';
import { RESERVATION_STATUS } from '../reservations/constants';
import { getServiceAmount } from './daily-log.amounts';
import {
  computeDebtPaymentTip,
  computeTipAndShortfall,
  resolveServiceItems,
  sumUnitPrices,
} from './daily-log.pricing';
import { allocateDailyLogReferenceCode } from './daily-log.reference';
import { DailyLogCompletionOutboxService } from './daily-log-completion-outbox.service';
import { claimOpenClientDebt } from '../finance/utils/claim-open-client-debt';
import { apiError } from '../common/errors/api-error-codes';

const DAILY_LOG_LIST_MAX_RANGE_DAYS = 62;
const DAILY_LOG_LIST_MAX_RESULTS = 500;

const parseDateOnlyInput = (value: string): Date => {
  try {
    return parseDateOnlyString(value);
  } catch {
    throw new BadRequestException('Datum nije validan.');
  }
};

@Injectable()
export class DailyLogService {
  private readonly logger = new Logger(DailyLogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly incomeSync: IncomeSyncService,
    private readonly loyalty: LoyaltyService,
    private readonly notifications: NotificationsService,
    private readonly completionOutbox: DailyLogCompletionOutboxService,
  ) {}

  private async rejectDuplicateServiceLog(
    error: unknown,
    reservationId: string,
  ): Promise<never> {
    const isUniqueConstraintError =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 'P2002';
    if (isUniqueConstraintError) {
      const existing = await this.prisma.dailyLogEntry.findFirst({
        where: { reservationId, kind: 'SERVICE' },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException(
          'Za ovu rezervaciju već postoji zapis u dnevnoj knjizi.',
        );
      }
    }
    throw error;
  }

  private async notifyClientDebt(params: {
    clientId: string;
    amount: number;
    dailyLogEntryId: string;
    ref?: string | null;
  }): Promise<void> {
    try {
      const copy = buildDebtCopy({
        ref: params.ref ?? undefined,
        amount: params.amount,
      });
      await this.notifications.send({
        userId: params.clientId,
        title: copy.title,
        body: copy.body,
        type: 'client_debt',
        data: {
          debtAmount: params.amount,
          dailyLogEntryId: params.dailyLogEntryId,
          kind: 'client_debt',
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to notify client debt for ${params.clientId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async create(dto: CreateDailyLogEntryDto, user: CurrentUserPayload) {
    await this.ensureStylistAccess(dto.stylistProfileId, user);
    const catalogRows = await this.prisma.service.findMany({
      where: {
        id: {
          in: [
            ...(dto.items?.map((i) => i.serviceId) ?? []),
            ...(dto.serviceIds ?? []),
            ...(dto.serviceId ? [dto.serviceId] : []),
          ].filter(Boolean),
        },
      },
      select: { id: true, price: true, gender: true },
    });
    const catalogPrices = new Map(
      catalogRows.map((s) => [s.id, Number(s.price)]),
    );
    const resolved = resolveServiceItems({
      items: dto.items,
      serviceIds: dto.serviceIds,
      serviceId: dto.serviceId,
      catalogPrices,
    });
    const serviceIds = resolved.map((r) => r.serviceId);
    if (dto.reservationId) {
      const res = await this.prisma.reservation.findUnique({
        where: { id: dto.reservationId },
        include: { items: true },
      });
      if (!res) throw new NotFoundException(apiError('MY_RESERVATIONS_NOT_FOUND'));
      const resServiceIds = res.items?.length
        ? res.items.map((i) => i.serviceId)
        : [res.serviceId];
      const normalizedResIds = [
        ...new Set(resServiceIds.map((x) => x.trim()).filter(Boolean)),
      ];
      const same =
        normalizedResIds.length === serviceIds.length &&
        normalizedResIds.every((id) => serviceIds.includes(id));
      if (!same) {
        throw new BadRequestException(
          'Servisi se ne podudaraju s rezervacijom.',
        );
      }
      const existing = await this.prisma.dailyLogEntry.findFirst({
        where: { reservationId: dto.reservationId, kind: 'SERVICE' },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException(
          'Za ovu rezervaciju već postoji zapis u dnevnoj knjizi.',
        );
      }
    }
    if (dto.clientId) {
      const client = await this.prisma.user.findUnique({
        where: { id: dto.clientId },
        select: { id: true, gender: true },
      });
      if (!client) throw new NotFoundException(apiError('USERS_NOT_FOUND'));
      if (!client.gender) throw new BadRequestException('GENDER_REQUIRED');
      if (catalogRows.length !== serviceIds.length) {
        throw new NotFoundException(apiError('RESERVE_SERVICE_UNAVAILABLE'));
      }
      if (catalogRows.some((s) => s.gender !== client.gender)) {
        throw new BadRequestException(apiError('RESERVE_SERVICE_GENDER_MISMATCH'));
      }
    }
    const date = parseDateOnlyInput(dto.date);
    const primaryServiceId = serviceIds[0]!;
    const totalPaid =
      dto.paidAmount != null ? Number(dto.paidAmount) : Number(dto.actualPrice);
    if (!Number.isFinite(totalPaid) || totalPaid < 0) {
      throw new BadRequestException('Iznos naplate nije validan.');
    }
    const settledDebtIds = Array.isArray(dto.settledDebtIds)
      ? [...new Set(dto.settledDebtIds.map((x) => x.trim()).filter(Boolean))]
      : [];
    let settledDebtsSum = 0;
    if (settledDebtIds.length > 0) {
      if (!dto.clientId) {
        throw new BadRequestException(
          'Za otplatu duga morate odabrati klijenta.',
        );
      }
      const debts = await this.prisma.clientDebt.findMany({
        where: {
          id: { in: settledDebtIds },
          clientId: dto.clientId,
          status: 'OPEN',
        },
        select: { id: true, amount: true },
      });
      if (debts.length !== settledDebtIds.length) {
        throw new BadRequestException(
          'Jedno ili više dugovanja nije validno ili je već zatvoreno.',
        );
      }
      settledDebtsSum = debts.reduce((acc, d) => acc + Number(d.amount), 0);
      if (totalPaid < settledDebtsSum) {
        throw new BadRequestException(
          'Nedovoljno za naplatu označenih dugova.',
        );
      }
    }
    const paidForServices = totalPaid - settledDebtsSum;
    const unitsSum = sumUnitPrices(resolved);
    const { tipAmount: tipBeforeLoyalty } = computeTipAndShortfall(
      paidForServices,
      unitsSum,
    );
    const shouldCreateDebt =
      dto.debtHandling === 'CREATE_DEBT' && !!dto.clientId;

    const result = await this.prisma.$transaction(async (tx) => {
      const publicReferenceCode = await allocateDailyLogReferenceCode(tx, date);
      const created = await tx.dailyLogEntry.create({
        data: {
          stylistProfileId: dto.stylistProfileId,
          reservationId: dto.reservationId,
          serviceId: primaryServiceId,
          clientId: dto.clientId,
          date,
          actualPrice: paidForServices,
          tipAmount: tipBeforeLoyalty,
          publicReferenceCode,
          notes: dto.notes,
          kind: 'SERVICE' as any,
          isManual: dto.isManual ?? !!dto.reservationId === false,
          status: 'PENDING',
        },
      });
      await tx.dailyLogEntryServiceItem.createMany({
        data: resolved.map((it, idx) => ({
          dailyLogEntryId: created.id,
          serviceId: it.serviceId,
          unitPrice: it.unitPrice,
          sortOrder: idx,
        })),
      });

      if (
        created.clientId &&
        dto.desiredLoyaltyPercent &&
        dto.desiredLoyaltyPercent > 0
      ) {
        await this.loyalty.redeemForDailyLog(
          {
            clientId: created.clientId,
            dailyLogEntryId: created.id,
            serviceIds,
            desiredPercent: dto.desiredLoyaltyPercent,
            actualPrice: paidForServices,
            coveredByDebtAmount: shouldCreateDebt ? Number.MAX_SAFE_INTEGER : 0,
          },
          tx,
        );
      }

      const refreshed = await tx.dailyLogEntry.findUnique({
        where: { id: created.id },
        select: {
          id: true,
          clientId: true,
          stylistProfileId: true,
          serviceId: true,
          notes: true,
          loyaltyDiscountAmount: true,
          items: { select: { unitPrice: true } },
        },
      });
      if (!refreshed) throw new NotFoundException('Zapis nije pronađen.');

      const base = refreshed.items.reduce(
        (acc, it) => acc + Number(it.unitPrice ?? 0),
        0,
      );
      const chargeBase = Math.max(
        0,
        base - Number(refreshed.loyaltyDiscountAmount ?? 0),
      );
      const { tipAmount, shortfall } = computeTipAndShortfall(
        paidForServices,
        chargeBase,
      );
      await tx.dailyLogEntry.update({
        where: { id: created.id },
        data: { tipAmount },
      });

      const debtNotification =
        shouldCreateDebt && shortfall > 0 && refreshed.clientId
          ? {
              clientId: refreshed.clientId,
              amount: shortfall,
              dailyLogEntryId: refreshed.id,
            }
          : null;
      if (debtNotification) {
        await tx.clientDebt.create({
          data: {
            clientId: refreshed.clientId!,
            stylistProfileId: refreshed.stylistProfileId,
            serviceId: refreshed.serviceId,
            dailyLogEntryId: refreshed.id,
            amount: shortfall,
            note: refreshed.notes ?? undefined,
            createdById: user.sub,
          },
        });
      }

      if (settledDebtIds.length > 0 && created.clientId) {
        await this.settleDebtsAndCreateLedgerEntries(
          {
            debtIds: settledDebtIds,
            clientId: created.clientId,
            date,
            sourceReservationId: null,
            sourceEntryId: created.id,
            userId: user.sub,
          },
          tx,
        );
      }
      return { entryId: created.id, debtNotification };
    });

    if (result.debtNotification) {
      await this.notifyClientDebt(result.debtNotification);
    }
    return this.findOne(result.entryId, user);
  }

  /** Kreira zapis iz rezervacije (nakon COMPLETED ili ručno povezivanje). */
  async createFromReservation(
    reservationId: string,
    dto: CreateFromReservationDto,
    _tipAmount: number,
    notes: string | undefined,
    user: CurrentUserPayload,
  ) {
    const res = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        items: { include: { service: { select: { id: true, price: true } } } },
        service: { select: { id: true, price: true } },
        confirmedStylist: true,
      },
    });
    if (!res) throw new NotFoundException(apiError('MY_RESERVATIONS_NOT_FOUND'));
    if (
      res.status !== 'COMPLETED' &&
      res.status !== 'ATTENDANCE_CONFIRMED' &&
      res.status !== 'IN_PROGRESS'
    ) {
      throw new BadRequestException(
        'Rezervacija mora biti završena ili u toku.',
      );
    }
    if (!res.confirmedStylistId)
      throw new BadRequestException('Rezervacija nema potvrđenog stilista.');
    await this.ensureStylistAccess(res.confirmedStylistId, user);
    const existing = await this.prisma.dailyLogEntry.findFirst({
      where: { reservationId, kind: 'SERVICE' },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'Za ovu rezervaciju već postoji zapis u dnevnoj knjizi.',
      );
    }
    const date = parseDateOnlyInput(toDateOnlyString(res.reservationDate));
    const resServiceIds = res.items?.length
      ? res.items.map((i) => i.serviceId)
      : [res.serviceId];
    const normalizedResIds = [
      ...new Set(resServiceIds.map((x) => x.trim()).filter(Boolean)),
    ];
    const primaryServiceId = normalizedResIds[0]!;

    const paidAmount =
      dto.paidAmount != null
        ? Number(dto.paidAmount)
        : dto.actualPrice != null
          ? Number(dto.actualPrice)
          : 0;
    if (!Number.isFinite(paidAmount) || paidAmount < 0) {
      throw new BadRequestException('Iznos naplate nije validan.');
    }
    const settledDebtIds = Array.isArray(dto.settledDebtIds)
      ? [...new Set(dto.settledDebtIds.map((x) => x.trim()).filter(Boolean))]
      : [];

    const base =
      res.items && res.items.length > 0
        ? res.items.reduce((acc, it) => acc + Number(it.service?.price ?? 0), 0)
        : Number(res.service?.price ?? 0);
    const loyaltyDiscountAmount = Number(
      (res as any).loyaltyDiscountAmount ?? 0,
    );
    const minCharge = Math.max(0, base - loyaltyDiscountAmount);
    let settledDebtsSum = 0;
    if (settledDebtIds.length > 0) {
      const debts = await this.prisma.clientDebt.findMany({
        where: {
          id: { in: settledDebtIds },
          clientId: res.clientId,
          status: 'OPEN',
        },
        select: { amount: true },
      });
      if (debts.length !== settledDebtIds.length) {
        throw new BadRequestException(
          'Jedno ili više dugovanja nije validno ili je već zatvoreno.',
        );
      }
      settledDebtsSum = debts.reduce((acc, d) => acc + Number(d.amount), 0);
      if (paidAmount < settledDebtsSum) {
        throw new BadRequestException(
          'Nedovoljno za naplatu označenih dugova.',
        );
      }
    }
    const paidForServices = paidAmount - settledDebtsSum;
    const { tipAmount: computedTip, shortfall } = computeTipAndShortfall(
      paidForServices,
      minCharge,
    );
    const shouldCreateDebt =
      dto.debtHandling === 'CREATE_DEBT' && shortfall > 0;

    const result = await this.prisma
      .$transaction(async (tx) => {
        const publicReferenceCode = await allocateDailyLogReferenceCode(
          tx,
          date,
        );
        const created = await tx.dailyLogEntry.create({
          data: {
            stylistProfileId: res.confirmedStylistId!,
            reservationId: res.id,
            serviceId: primaryServiceId,
            clientId: res.clientId,
            date,
            actualPrice: paidForServices,
            tipAmount: computedTip,
            publicReferenceCode,
            notes,
            kind: 'SERVICE' as any,
            isManual: false,
            status: 'PENDING',
          },
        });
        const itemRows =
          res.items && res.items.length > 0
            ? res.items.map((it, idx) => ({
                dailyLogEntryId: created.id,
                serviceId: it.serviceId,
                unitPrice: Number(it.service?.price ?? 0),
                sortOrder: idx,
              }))
            : [
                {
                  dailyLogEntryId: created.id,
                  serviceId: primaryServiceId,
                  unitPrice: Number(res.service?.price ?? 0),
                  sortOrder: 0,
                },
              ];
        await tx.dailyLogEntryServiceItem.createMany({ data: itemRows });

        const debtNotification =
          shouldCreateDebt && res.clientId
            ? {
                clientId: res.clientId,
                amount: shortfall,
                dailyLogEntryId: created.id,
              }
            : null;
        if (debtNotification) {
          await tx.clientDebt.create({
            data: {
              clientId: res.clientId,
              stylistProfileId: res.confirmedStylistId!,
              serviceId: primaryServiceId,
              reservationId: res.id,
              dailyLogEntryId: created.id,
              amount: shortfall,
              note: notes,
              createdById: user.sub,
            },
          });
        }

        if (settledDebtIds.length > 0) {
          await this.settleDebtsAndCreateLedgerEntries(
            {
              debtIds: settledDebtIds,
              clientId: res.clientId,
              date,
              sourceReservationId: res.id,
              sourceEntryId: created.id,
              userId: user.sub,
            },
            tx,
          );
        }
        return { entryId: created.id, debtNotification };
      })
      .catch((error: unknown) =>
        this.rejectDuplicateServiceLog(error, reservationId),
      );

    if (result.debtNotification) {
      await this.notifyClientDebt(result.debtNotification);
    }
    return this.findOne(result.entryId, user);
  }

  private async settleDebtsAndCreateLedgerEntries(
    params: {
      debtIds: string[];
      clientId: string;
      date: Date;
      sourceReservationId: string | null;
      sourceEntryId: string;
      userId: string;
    },
    transaction?: Prisma.TransactionClient,
  ) {
    const debtIds = [
      ...new Set(params.debtIds.map((x) => x.trim()).filter(Boolean)),
    ];
    if (debtIds.length === 0) return;
    const date = parseDateOnlyInput(toDateOnlyString(params.date));

    const settle = async (tx: Prisma.TransactionClient) => {
      const debts = await tx.clientDebt.findMany({
        where: {
          id: { in: debtIds },
          clientId: params.clientId,
          status: 'OPEN',
        },
        select: {
          id: true,
          clientId: true,
          stylistProfileId: true,
          serviceId: true,
          reservationId: true,
          dailyLogEntryId: true,
          amount: true,
        },
      });
      if (debts.length !== debtIds.length) {
        throw new BadRequestException(
          'Jedno ili više dugovanja nije validno ili je već zatvoreno.',
        );
      }

      const book = await this.incomeSync.assertBookOpenForDate(date, tx);
      for (const d of debts) {
        const amount = Number(d.amount);
        if (!Number.isFinite(amount) || amount <= 0) continue;

        const serviceId = d.serviceId
          ? d.serviceId
          : d.dailyLogEntryId
            ? (
                await tx.dailyLogEntry.findUnique({
                  where: { id: d.dailyLogEntryId },
                  select: { serviceId: true },
                })
              )?.serviceId
            : d.reservationId
              ? (
                  await tx.reservation.findUnique({
                    where: { id: d.reservationId },
                    select: { serviceId: true },
                  })
                )?.serviceId
              : null;
        if (!serviceId) {
          throw new BadRequestException(
            'Nedostaje servis za knjiženje naplate duga.',
          );
        }
        const service = await tx.service.findUnique({
          where: { id: serviceId },
          select: { price: true },
        });
        const listPrice = Number(service?.price ?? 0);
        const tipAmount = computeDebtPaymentTip(amount, listPrice);
        const kifAmount = getServiceAmount(amount, tipAmount);
        const debtRef = await allocateDailyLogReferenceCode(tx, date);

        const claimed = await claimOpenClientDebt(tx, {
          debtId: d.id,
          clientId: params.clientId,
          settledById: params.userId,
        });
        if (!claimed) {
          throw new ConflictException(
            'Jedno ili više dugovanja je u međuvremenu zatvoreno. Osvježite stanje i pokušajte ponovo.',
          );
        }

        const debtPayment = await tx.dailyLogEntry.create({
          data: {
            stylistProfileId: d.stylistProfileId,
            reservationId: params.sourceReservationId,
            serviceId,
            clientId: d.clientId,
            kind: 'DEBT_PAYMENT' as any,
            debtId: d.id,
            sourceEntryId: params.sourceEntryId,
            date,
            actualPrice: amount,
            tipAmount,
            publicReferenceCode: debtRef,
            notes: 'Naplata duga',
            isManual: true,
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });

        await tx.incomeBookManualEntry.create({
          data: {
            bookId: book.id,
            date,
            serviceId,
            stylistProfileId: d.stylistProfileId,
            clientId: d.clientId,
            dailyLogEntryId: debtPayment.id,
            amount: kifAmount,
            tipAmount,
            notes: 'Naplata duga',
            createdById: params.userId,
          },
        });
      }

      await this.incomeSync.recalculateTotals(book.id, tx);
    };

    if (transaction) return settle(transaction);
    return this.prisma.$transaction(settle);
  }

  async findAll(
    query: {
      fromDate?: string;
      toDate?: string;
      stylistProfileId?: string;
      includeDeleted?: boolean;
    },
    user: CurrentUserPayload,
  ) {
    const where: {
      date?: { gte?: Date; lt?: Date };
      stylistProfileId?: string;
      deletedAt?: Date | null;
      OR?: Array<Record<string, unknown>>;
    } = {
      // Linked debt settlements are part of the parent SERVICE entry; only
      // standalone manual DEBT_PAYMENT rows appear as their own list items.
      OR: [{ kind: { not: 'DEBT_PAYMENT' } }, { sourceEntryId: null }],
    };
    if (!query.fromDate || !query.toDate) {
      throw new BadRequestException(
        `Unesite početni i završni datum; opseg ne smije biti duži od ${DAILY_LOG_LIST_MAX_RANGE_DAYS} dana.`,
      );
    }
    try {
      const dateBounds = getDateOnlyRangeBounds(query.fromDate, query.toDate);
      const rangeDays =
        (dateBounds.lt.getTime() - dateBounds.gte.getTime()) / 86_400_000;
      if (rangeDays > DAILY_LOG_LIST_MAX_RANGE_DAYS) {
        throw new BadRequestException(
          `Datumski opseg ne smije biti duži od ${DAILY_LOG_LIST_MAX_RANGE_DAYS} dana.`,
        );
      }
      where.date = dateBounds;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Datumski opseg nije validan.');
    }
    if (query.stylistProfileId) {
      await this.ensureStylistOrAdmin(query.stylistProfileId, user);
      where.stylistProfileId = query.stylistProfileId;
    }
    const includeDeleted = !!query.includeDeleted && this.isAdminOrOwner(user);
    if (!includeDeleted) {
      where.deletedAt = null;
    }
    const entries = await this.prisma.dailyLogEntry.findMany({
      where,
      include: this.entryInclude(),
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: DAILY_LOG_LIST_MAX_RESULTS + 1,
    });
    if (entries.length > DAILY_LOG_LIST_MAX_RESULTS) {
      throw new BadRequestException(
        `Opseg sadrži više od ${DAILY_LOG_LIST_MAX_RESULTS} zapisa. Smanjite datumski opseg.`,
      );
    }
    return entries;
  }

  async findOne(
    id: string,
    user: CurrentUserPayload,
    opts?: { includeDeleted?: boolean },
  ) {
    const entry = await this.prisma.dailyLogEntry.findUnique({
      where: { id },
      include: this.entryInclude(),
    });
    if (!entry) throw new NotFoundException('Zapis nije pronađen.');
    if (entry.deletedAt && !opts?.includeDeleted) {
      if (!this.isAdminOrOwner(user)) {
        throw new NotFoundException('Zapis nije pronađen.');
      }
    }
    await this.ensureStylistOrAdmin(entry.stylistProfileId, user);
    return entry;
  }

  async update(
    id: string,
    dto: UpdateDailyLogEntryDto,
    user: CurrentUserPayload,
  ) {
    // Delegated to DailyLogAdminService via controller; kept for tests/compat.
    const entry = await this.findOne(id, user);
    if (entry.status === 'COMPLETED')
      throw new BadRequestException('Završeni zapis nije moguće mijenjati.');
    const updated = await this.prisma.dailyLogEntry.update({
      where: { id },
      data: {
        ...(dto.actualPrice != null && { actualPrice: dto.actualPrice }),
        ...(dto.tipAmount != null && { tipAmount: dto.tipAmount }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: this.entryInclude(),
    });

    if (
      updated.clientId &&
      dto.desiredLoyaltyPercent != null &&
      dto.desiredLoyaltyPercent > 0
    ) {
      await this.loyalty.redeemForDailyLog({
        clientId: updated.clientId,
        dailyLogEntryId: updated.id,
        serviceIds: updated.items?.map((item) => item.serviceId) ?? [
          updated.serviceId,
        ],
        desiredPercent: dto.desiredLoyaltyPercent,
        actualPrice: Number(updated.actualPrice),
      });
      return this.findOne(updated.id, user);
    }

    return updated;
  }

  async complete(id: string, user: CurrentUserPayload) {
    // Authorize before taking database locks, then re-read and re-authorize the
    // row inside the transaction to avoid acting on a stale reassignment.
    await this.findOne(id, user);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM "daily_log_entries" WHERE id = ${id} FOR UPDATE`,
      );
      const entry = await tx.dailyLogEntry.findUnique({
        where: { id },
        include: this.entryInclude(),
      });
      if (!entry || entry.deletedAt) {
        throw new NotFoundException('Zapis nije pronađen.');
      }
      if (
        !this.isAdminOrOwner(user) &&
        entry.stylistProfile.user.id !== user.sub
      ) {
        throw new ForbiddenException('Nemate pristup ovom stilistu.');
      }
      if (entry.status !== 'PENDING' && entry.status !== 'COMPLETED') {
        throw new BadRequestException(
          'Zapis nije u statusu koji se može završiti.',
        );
      }

      const now = new Date();
      const isNewCompletion = entry.status === 'PENDING';
      const completionVersion = Math.max(
        1,
        Number(entry.completionVersion ?? 0) + (isNewCompletion ? 1 : 0),
      );
      const completedAt = entry.completedAt ?? now;
      if (
        isNewCompletion ||
        entry.completedAt === null ||
        entry.completionVersion !== completionVersion
      ) {
        await tx.dailyLogEntry.update({
          where: { id },
          data: {
            status: 'COMPLETED',
            completedAt,
            completionVersion,
          },
        });
      }

      if (entry.reservationId) {
        await tx.$queryRaw(
          Prisma.sql`SELECT id FROM "reservations" WHERE id = ${entry.reservationId} FOR UPDATE`,
        );
        const reservation = await tx.reservation.findUnique({
          where: { id: entry.reservationId },
          select: {
            id: true,
            clientId: true,
            confirmedStylistId: true,
            status: true,
            completedAt: true,
          },
        });
        if (!reservation) {
          if (isNewCompletion) {
            throw new NotFoundException(apiError('MY_RESERVATIONS_NOT_FOUND'));
          }
        } else if (reservation.confirmedStylistId !== entry.stylistProfileId) {
          if (isNewCompletion) {
            throw new ForbiddenException(
              'Samo potvrđeni stilist može završiti ovu rezervaciju.',
            );
          }
        } else if (reservation.status !== RESERVATION_STATUS.COMPLETED) {
          const canCompleteReservation =
            reservation.status === RESERVATION_STATUS.IN_PROGRESS ||
            reservation.status === RESERVATION_STATUS.ATTENDANCE_CONFIRMED ||
            reservation.status === RESERVATION_STATUS.AWAITING_DAILY_LOG;
          if (!canCompleteReservation) {
            if (isNewCompletion) {
              throw new BadRequestException(
                'Rezervaciju nije moguće završiti u trenutnom statusu.',
              );
            }
          } else {
            assertReservationTransition(
              reservation.status,
              RESERVATION_STATUS.COMPLETED,
            );
            await tx.reservation.update({
              where: { id: reservation.id },
              data: {
                status: RESERVATION_STATUS.COMPLETED,
                completedAt: reservation.completedAt ?? now,
              },
            });
          }
        } else if (!reservation.completedAt) {
          await tx.reservation.update({
            where: { id: reservation.id },
            data: { completedAt: now },
          });
        }
      }

      await this.incomeSync.addEntryFromDailyLog(id, tx);
      if (entry.kind === 'SERVICE') {
        await this.loyalty.earnFromDailyLog(
          {
            id: entry.id,
            clientId: entry.clientId,
            actualPrice: Number(entry.actualPrice),
            tipAmount: Number(entry.tipAmount),
            serviceId: entry.serviceId,
            idempotencyKey: `daily-log.earn:${entry.id}:v${completionVersion}`,
          },
          tx,
        );
      }

      const outboxEvent = await tx.outboxEvent.upsert({
        where: {
          dedupeKey: `daily-log.completed:${entry.id}:v${completionVersion}`,
        },
        create: {
          eventType: 'daily_log.completed',
          aggregateId: entry.id,
          dedupeKey: `daily-log.completed:${entry.id}:v${completionVersion}`,
          payload: {
            dailyLogEntryId: entry.id,
            completionVersion,
          },
        },
        update: {},
      });
      const completed = await tx.dailyLogEntry.findUnique({
        where: { id },
        include: this.entryInclude(),
      });
      if (!completed) throw new NotFoundException('Zapis nije pronađen.');
      return { entry: completed, outboxEventId: outboxEvent.id };
    });

    // The outbox service is best-effort after commit; pending delivery remains
    // durable and is retried by its scheduled worker or the next HTTP replay.
    void this.completionOutbox.dispatchAfterCommit(result.outboxEventId);
    return result.entry;
  }

  async addImage(
    entryId: string,
    dto: {
      uploadId: string;
      isBefore?: boolean;
      isAfter?: boolean;
      description?: string;
      sortOrder?: number;
    },
    user: CurrentUserPayload,
  ) {
    const entry = await this.findOne(entryId, user);
    if (entry.status === 'COMPLETED')
      throw new BadRequestException(
        'Ne možete dodavati slike završenom zapisu.',
      );
    return this.prisma.dailyLogImage.create({
      data: {
        dailyLogEntryId: entryId,
        uploadId: dto.uploadId,
        isBefore: dto.isBefore ?? false,
        isAfter: dto.isAfter ?? false,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async ensureStylistAccess(
    stylistProfileId: string,
    user: CurrentUserPayload,
  ) {
    if (this.isAdminOrOwner(user)) return;
    const sp = await this.prisma.stylistProfile.findUnique({
      where: { id: stylistProfileId },
      select: { userId: true },
    });
    if (!sp || sp.userId !== user.sub)
      throw new ForbiddenException('Nemate pristup ovom stilistu.');
  }

  private async ensureStylistOrAdmin(
    stylistProfileId: string,
    user: CurrentUserPayload,
  ) {
    await this.ensureStylistAccess(stylistProfileId, user);
  }

  isAdminOrOwner(user: CurrentUserPayload): boolean {
    return user.roles.includes('SYSTEM_ADMIN') || user.roles.includes('OWNER');
  }

  entryInclude() {
    return {
      stylistProfile: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      service: { select: { id: true, name: true } },
      items: {
        orderBy: { sortOrder: 'asc' as const },
        include: {
          service: { select: { id: true, name: true, price: true } },
        },
      },
      debtPaymentEntries: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' as const },
        select: {
          id: true,
          actualPrice: true,
          tipAmount: true,
          debtId: true,
          notes: true,
          date: true,
          publicReferenceCode: true,
          service: { select: { id: true, name: true } },
          debt: {
            select: {
              id: true,
              amount: true,
              createdAt: true,
              service: { select: { id: true, name: true } },
            },
          },
        },
      },
      client: { select: { id: true, firstName: true, lastName: true } },
      reservation: {
        select: {
          id: true,
          status: true,
          cancelReason: true,
          reservationDate: true,
          startTime: true,
          endTime: true,
          publicReferenceCode: true,
          acceptanceMode: true,
          bookingOrigin: true,
          attendancePolicy: true,
          confirmedStylistId: true,
        },
      },
      images: { include: { upload: true } },
      deletedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    };
  }
}
