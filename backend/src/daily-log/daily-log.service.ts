import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDailyLogEntryDto } from './dto/create-daily-log-entry.dto';
import { UpdateDailyLogEntryDto } from './dto/update-daily-log-entry.dto';
import type { CreateFromReservationDto } from './dto/create-from-reservation.dto';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { IncomeSyncService } from '../finance/income-sync.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { NotificationsService } from '../notifications/notifications.service';
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

@Injectable()
export class DailyLogService {
  private readonly logger = new Logger(DailyLogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly incomeSync: IncomeSyncService,
    private readonly loyalty: LoyaltyService,
    private readonly notifications: NotificationsService,
  ) {}

  private async notifyClientDebt(params: {
    clientId: string;
    amount: number;
    dailyLogEntryId: string;
  }): Promise<void> {
    try {
      await this.notifications.send({
        userId: params.clientId,
        title: 'Novo dugovanje',
        body: `Evidentirano je dugovanje od ${params.amount.toFixed(2)} KM.`,
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
      if (!res) throw new NotFoundException('Rezervacija nije pronađena.');
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
        throw new BadRequestException('Servisi se ne podudaraju s rezervacijom.');
      }
    }
    if (dto.clientId) {
      const client = await this.prisma.user.findUnique({
        where: { id: dto.clientId },
        select: { id: true, gender: true },
      });
      if (!client) throw new NotFoundException('Korisnik nije pronađen.');
      if (!client.gender) throw new BadRequestException('GENDER_REQUIRED');
      if (catalogRows.length !== serviceIds.length) {
        throw new NotFoundException('Servis nije pronađen.');
      }
      if (catalogRows.some((s) => s.gender !== client.gender)) {
        throw new BadRequestException('SERVICE_GENDER_MISMATCH');
      }
    }
    const date = new Date(dto.date);
    date.setHours(0, 0, 0, 0);
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
        throw new BadRequestException('Za otplatu duga morate odabrati klijenta.');
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
    const publicReferenceCode = await allocateDailyLogReferenceCode(
      this.prisma,
      date,
    );
    const created = await this.prisma.dailyLogEntry.create({
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
      include: this.entryInclude(),
    });
    await this.prisma.dailyLogEntryServiceItem.createMany({
      data: resolved.map((it, idx) => ({
        dailyLogEntryId: created.id,
        serviceId: it.serviceId,
        unitPrice: it.unitPrice,
        sortOrder: idx,
      })),
    });
    const shouldCreateDebt =
      dto.debtHandling === 'CREATE_DEBT' && !!created.clientId;
    if (created.clientId && dto.desiredLoyaltyPercent && dto.desiredLoyaltyPercent > 0) {
      await this.loyalty.redeemForDailyLog({
        clientId: created.clientId,
        dailyLogEntryId: created.id,
        serviceIds,
        desiredPercent: dto.desiredLoyaltyPercent,
        actualPrice: paidForServices,
        coveredByDebtAmount: shouldCreateDebt ? Number.MAX_SAFE_INTEGER : 0,
      });
    }
    const refreshed = await this.prisma.dailyLogEntry.findUnique({
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
    if (refreshed) {
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
      await this.prisma.dailyLogEntry.update({
        where: { id: created.id },
        data: { tipAmount },
      });
      if (shouldCreateDebt && shortfall > 0 && refreshed.clientId) {
        await this.prisma.clientDebt.create({
          data: {
            clientId: refreshed.clientId,
            stylistProfileId: refreshed.stylistProfileId,
            serviceId: refreshed.serviceId,
            dailyLogEntryId: refreshed.id,
            amount: shortfall,
            note: refreshed.notes ?? undefined,
            createdById: user.sub,
          },
        });
        await this.notifyClientDebt({
          clientId: refreshed.clientId,
          amount: shortfall,
          dailyLogEntryId: refreshed.id,
        });
      }
    }
    if (settledDebtIds.length > 0 && created.clientId) {
      await this.settleDebtsAndCreateLedgerEntries({
        debtIds: settledDebtIds,
        clientId: created.clientId,
        date,
        sourceReservationId: null,
        sourceEntryId: created.id,
        userId: user.sub,
      });
    }
    return this.findOne(created.id, user);
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
    if (!res) throw new NotFoundException('Rezervacija nije pronađena.');
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
      where: { reservationId },
    });
    if (existing)
      throw new BadRequestException(
        'Za ovu rezervaciju već postoji zapis u dnevnoj knjizi.',
      );
    const date = new Date(res.reservationDate);
    date.setHours(0, 0, 0, 0);
    const resServiceIds = res.items?.length
      ? res.items.map((i) => i.serviceId)
      : [res.serviceId];
    const normalizedResIds = [...new Set(resServiceIds.map((x) => x.trim()).filter(Boolean))];
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
    const loyaltyDiscountAmount = Number((res as any).loyaltyDiscountAmount ?? 0);
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
        throw new BadRequestException('Nedovoljno za naplatu označenih dugova.');
      }
    }
    const paidForServices = paidAmount - settledDebtsSum;
    const { tipAmount: computedTip, shortfall } = computeTipAndShortfall(
      paidForServices,
      minCharge,
    );
    const debtAmount = shortfall;
    const shouldCreateDebt = dto.debtHandling === 'CREATE_DEBT' && debtAmount > 0;

    const publicReferenceCode = await allocateDailyLogReferenceCode(
      this.prisma,
      date,
    );
    const created = await this.prisma.dailyLogEntry.create({
      data: {
        stylistProfileId: res.confirmedStylistId,
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
      include: this.entryInclude(),
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
    await this.prisma.dailyLogEntryServiceItem.createMany({ data: itemRows });
    if (shouldCreateDebt) {
      await this.prisma.clientDebt.create({
        data: {
          clientId: res.clientId,
          stylistProfileId: res.confirmedStylistId,
          serviceId: primaryServiceId,
          reservationId: res.id,
          dailyLogEntryId: created.id,
          amount: debtAmount,
          note: notes,
          createdById: user.sub,
        },
      });
      await this.notifyClientDebt({
        clientId: res.clientId,
        amount: debtAmount,
        dailyLogEntryId: created.id,
      });
    }

    if (settledDebtIds.length > 0) {
      await this.settleDebtsAndCreateLedgerEntries({
        debtIds: settledDebtIds,
        clientId: res.clientId,
        date,
        sourceReservationId: res.id,
        sourceEntryId: created.id,
        userId: user.sub,
      });
    }
    return this.findOne(created.id, user);
  }

  private async settleDebtsAndCreateLedgerEntries(params: {
    debtIds: string[];
    clientId: string;
    date: Date;
    sourceReservationId: string | null;
    sourceEntryId: string;
    userId: string;
  }) {
    const debtIds = [...new Set(params.debtIds.map((x) => x.trim()).filter(Boolean))];
    if (debtIds.length === 0) return;
    const date = new Date(params.date);
    date.setHours(0, 0, 0, 0);

    const debts = await this.prisma.clientDebt.findMany({
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
      throw new BadRequestException('Jedno ili više dugovanja nije validno ili je već zatvoreno.');
    }

    const book = await this.incomeSync.assertBookOpenForDate(date);

    await this.prisma.$transaction(async (tx) => {
      for (const d of debts) {
        const amount = Number(d.amount);
        if (!Number.isFinite(amount) || amount <= 0) continue;

        const serviceId = d.serviceId
          ? d.serviceId
          : d.dailyLogEntryId
            ? (await tx.dailyLogEntry.findUnique({
                where: { id: d.dailyLogEntryId },
                select: { serviceId: true },
              }))?.serviceId
            : d.reservationId
              ? (await tx.reservation.findUnique({
                  where: { id: d.reservationId },
                  select: { serviceId: true },
                }))?.serviceId
              : null;
        if (!serviceId) {
          throw new BadRequestException('Nedostaje servis za knjiženje naplate duga.');
        }
        const service = await tx.service.findUnique({
          where: { id: serviceId },
          select: { price: true },
        });
        const listPrice = Number(service?.price ?? 0);
        const tipAmount = computeDebtPaymentTip(amount, listPrice);
        const kifAmount = getServiceAmount(amount, tipAmount);
        const debtRef = await allocateDailyLogReferenceCode(tx as any, date);

        await tx.clientDebt.update({
          where: { id: d.id },
          data: {
            status: 'SETTLED',
            settledAt: new Date(),
            settledById: params.userId,
          },
        });

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
    });
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
      date?: { gte?: Date; lte?: Date };
      stylistProfileId?: string;
      deletedAt?: Date | null;
      OR?: Array<Record<string, unknown>>;
    } = {
      // Linked debt settlements are part of the parent SERVICE entry; only
      // standalone manual DEBT_PAYMENT rows appear as their own list items.
      OR: [
        { kind: { not: 'DEBT_PAYMENT' } },
        { sourceEntryId: null },
      ],
    };
    if (query.fromDate)
      where.date = { ...where.date, gte: new Date(query.fromDate) };
    if (query.toDate)
      where.date = { ...where.date, lte: new Date(query.toDate) };
    if (query.stylistProfileId) {
      await this.ensureStylistOrAdmin(query.stylistProfileId, user);
      where.stylistProfileId = query.stylistProfileId;
    }
    const includeDeleted =
      !!query.includeDeleted && this.isAdminOrOwner(user);
    if (!includeDeleted) {
      where.deletedAt = null;
    }
    return this.prisma.dailyLogEntry.findMany({
      where,
      include: this.entryInclude(),
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
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
        serviceId: updated.serviceId,
        desiredPercent: dto.desiredLoyaltyPercent,
        actualPrice: Number(updated.actualPrice),
      });
      return this.findOne(updated.id, user);
    }

    return updated;
  }

  async complete(id: string, user: CurrentUserPayload) {
    const entry = await this.findOne(id, user);
    if (entry.status === 'COMPLETED')
      throw new BadRequestException('Zapis je već završen.');
    const updated = await this.prisma.dailyLogEntry.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date() },
      include: this.entryInclude(),
    });

    // Ako je zapis vezan za rezervaciju, završavamo i rezervaciju u istom trenutku.
    // Stilist realno "završava posao" tek nakon naplate + before/after.
    if (updated.reservationId) {
      const res = await this.prisma.reservation.findUnique({
        where: { id: updated.reservationId },
        select: { id: true, confirmedStylistId: true, status: true },
      });
      if (!res) throw new NotFoundException('Rezervacija nije pronađena.');
      if (res.confirmedStylistId !== updated.stylistProfileId) {
        throw new ForbiddenException(
          'Samo potvrđeni stilist može završiti ovu rezervaciju.',
        );
      }
      if (res.status !== 'IN_PROGRESS' &&
        res.status !== 'ATTENDANCE_CONFIRMED' &&
        res.status !== RESERVATION_STATUS.AWAITING_DAILY_LOG) {
        throw new BadRequestException(
          'Rezervaciju nije moguće završiti u trenutnom statusu.',
        );
      }
      assertReservationTransition(res.status, RESERVATION_STATUS.COMPLETED);
      await this.prisma.reservation.update({
        where: { id: res.id },
        data: { status: RESERVATION_STATUS.COMPLETED, completedAt: new Date() },
      });
      // Minimalna loyalty implementacija: osiguraj account
      await this.loyalty.ensureAccountForUser(updated.clientId ?? '').catch(() => {});
    }

    // KIF knjiženje je dio završetka zapisa; greška ne smije ostati nevidljiva.
    await this.incomeSync.addEntryFromDailyLog(id).catch((err: unknown) => {
      this.logger.error(
        `KIF knjiženje nije uspjelo za dnevni zapis ${id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw err;
    });
    if (updated.clientId) {
      await this.loyalty
        .earnFromDailyLog({
          id: updated.id,
          clientId: updated.clientId,
          actualPrice: Number(updated.actualPrice),
          tipAmount: Number(updated.tipAmount),
          serviceId: updated.serviceId,
        })
        .catch(() => {});
    }
    return updated;
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
    return (
      user.roles.includes('SYSTEM_ADMIN') || user.roles.includes('OWNER')
    );
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
        },
      },
      images: { include: { upload: true } },
      deletedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    };
  }
}
