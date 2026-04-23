import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDailyLogEntryDto } from './dto/create-daily-log-entry.dto';
import { UpdateDailyLogEntryDto } from './dto/update-daily-log-entry.dto';
import type { CreateFromReservationDto } from './dto/create-from-reservation.dto';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { IncomeBooksService } from '../finance/income-books.service';
import { LoyaltyService } from '../loyalty/loyalty.service';

@Injectable()
export class DailyLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly incomeBooks: IncomeBooksService,
    private readonly loyalty: LoyaltyService,
  ) {}

  async create(dto: CreateDailyLogEntryDto, user: CurrentUserPayload) {
    await this.ensureStylistAccess(dto.stylistProfileId, user);
    const serviceIdsRaw =
      dto.serviceIds && dto.serviceIds.length > 0
        ? dto.serviceIds
        : dto.serviceId
          ? [dto.serviceId]
          : [];
    const serviceIds = [...new Set(serviceIdsRaw.map((x) => x.trim()).filter(Boolean))];
    if (serviceIds.length === 0) {
      throw new BadRequestException('SERVICE_REQUIRED');
    }
    if (dto.reservationId) {
      const res = await this.prisma.reservation.findUnique({
        where: { id: dto.reservationId },
        include: { items: true },
      });
      if (!res) throw new NotFoundException('Rezervacija nije pronađena.');
      const resServiceIds = res.items?.length
        ? res.items.map((i) => i.serviceId)
        : [res.serviceId];
      const normalizedResIds = [...new Set(resServiceIds.map((x) => x.trim()).filter(Boolean))];
      const same =
        normalizedResIds.length === serviceIds.length &&
        normalizedResIds.every((id) => serviceIds.includes(id));
      if (!same) {
        throw new BadRequestException('Servisi se ne podudaraju s rezervacijom.');
      }
    }
    if (dto.clientId) {
      const [client, services] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: dto.clientId },
          select: { id: true, gender: true },
        }),
        this.prisma.service.findMany({
          where: { id: { in: serviceIds } },
          select: { id: true, gender: true },
        }),
      ]);
      if (!client) throw new NotFoundException('Korisnik nije pronađen.');
      if (!client.gender) throw new BadRequestException('GENDER_REQUIRED');
      if (services.length !== serviceIds.length)
        throw new NotFoundException('Servis nije pronađen.');
      if (services.some((s) => s.gender !== client.gender)) {
        throw new BadRequestException('SERVICE_GENDER_MISMATCH');
      }
    }
    const date = new Date(dto.date);
    date.setHours(0, 0, 0, 0);
    const primaryServiceId = serviceIds[0]!;
    const paidAmount =
      dto.paidAmount != null ? Number(dto.paidAmount) : Number(dto.actualPrice);
    if (!Number.isFinite(paidAmount) || paidAmount < 0) {
      throw new BadRequestException('Iznos naplate nije validan.');
    }
    const created = await this.prisma.dailyLogEntry.create({
      data: {
        stylistProfileId: dto.stylistProfileId,
        reservationId: dto.reservationId,
        serviceId: primaryServiceId,
        clientId: dto.clientId,
        date,
        actualPrice: paidAmount,
        tipAmount: dto.tipAmount ?? 0,
        notes: dto.notes,
        kind: 'SERVICE' as any,
        isManual: dto.isManual ?? !!dto.reservationId === false,
        status: 'PENDING',
      },
      include: this.entryInclude(),
    });

    await this.prisma.dailyLogEntryServiceItem.createMany({
      data: serviceIds.map((sid, idx) => ({
        dailyLogEntryId: created.id,
        serviceId: sid,
        sortOrder: idx,
      })),
    });

    const shouldCreateDebt = dto.debtHandling === 'CREATE_DEBT' && !!created.clientId;

    if (created.clientId && dto.desiredLoyaltyPercent && dto.desiredLoyaltyPercent > 0) {
      await this.loyalty.redeemForDailyLog({
        clientId: created.clientId,
        dailyLogEntryId: created.id,
        serviceIds,
        desiredPercent: dto.desiredLoyaltyPercent,
        actualPrice: Number(created.actualPrice),
        coveredByDebtAmount: shouldCreateDebt ? Number.MAX_SAFE_INTEGER : 0,
      });
    }

    if (shouldCreateDebt) {
      const refreshed = await this.prisma.dailyLogEntry.findUnique({
        where: { id: created.id },
        select: {
          id: true,
          clientId: true,
          stylistProfileId: true,
          serviceId: true,
          notes: true,
          loyaltyDiscountAmount: true,
          items: { select: { service: { select: { price: true } } } },
        },
      });
      if (refreshed?.clientId) {
        const base = refreshed.items.reduce(
          (acc, it) => acc + Number(it.service?.price ?? 0),
          0,
        );
        const minCharge = Math.max(0, base - Number(refreshed.loyaltyDiscountAmount ?? 0));
        const debtAmount = Math.max(0, minCharge - paidAmount);
        if (debtAmount > 0) {
          await this.prisma.clientDebt.create({
            data: {
              clientId: refreshed.clientId,
              stylistProfileId: refreshed.stylistProfileId,
              serviceId: refreshed.serviceId,
              dailyLogEntryId: refreshed.id,
              amount: debtAmount,
              note: refreshed.notes ?? undefined,
              createdById: user.sub,
            },
          });
        }
      }
    }

    // Zatvori odabrana dugovanja i kreiraj posebne DEBT_PAYMENT stavke.
    const settledDebtIds = Array.isArray(dto.settledDebtIds)
      ? [...new Set(dto.settledDebtIds.map((x) => x.trim()).filter(Boolean))]
      : [];
    if (settledDebtIds.length > 0) {
      if (!created.clientId) {
        throw new BadRequestException('Za otplatu duga morate odabrati klijenta.');
      }
      await this.settleDebtsAndCreateLedgerEntries({
        debtIds: settledDebtIds,
        clientId: created.clientId,
        date,
        sourceReservationId: null,
        userId: user.sub,
      });
    }

    return this.findOne(created.id, user);
  }

  /** Kreira zapis iz rezervacije (nakon COMPLETED ili ručno povezivanje). */
  async createFromReservation(
    reservationId: string,
    dto: CreateFromReservationDto,
    tipAmount: number,
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
    const debtAmount = Math.max(0, minCharge - paidAmount);
    const shouldCreateDebt = dto.debtHandling === 'CREATE_DEBT' && debtAmount > 0;

    const created = await this.prisma.dailyLogEntry.create({
      data: {
        stylistProfileId: res.confirmedStylistId,
        reservationId: res.id,
        serviceId: primaryServiceId,
        clientId: res.clientId,
        date,
        actualPrice: paidAmount,
        tipAmount: tipAmount ?? 0,
        notes,
        kind: 'SERVICE' as any,
        isManual: false,
        status: 'PENDING',
      },
      include: this.entryInclude(),
    });
    await this.prisma.dailyLogEntryServiceItem.createMany({
      data: normalizedResIds.map((sid, idx) => ({
        dailyLogEntryId: created.id,
        serviceId: sid,
        sortOrder: idx,
      })),
    });
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
    }

    if (settledDebtIds.length > 0) {
      await this.settleDebtsAndCreateLedgerEntries({
        debtIds: settledDebtIds,
        clientId: res.clientId,
        date,
        sourceReservationId: res.id,
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

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const book = await this.incomeBooks.getOrCreateForMonth(year, month);

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

        await tx.clientDebt.update({
          where: { id: d.id },
          data: {
            status: 'SETTLED',
            settledAt: new Date(),
            settledById: params.userId,
          },
        });

        await tx.dailyLogEntry.create({
          data: {
            stylistProfileId: d.stylistProfileId,
            reservationId: params.sourceReservationId,
            serviceId,
            clientId: d.clientId,
            kind: 'DEBT_PAYMENT' as any,
            debtId: d.id,
            date,
            actualPrice: amount,
            tipAmount: 0,
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
            amount,
            tipAmount: 0,
            notes: 'Naplata duga',
            createdById: params.userId,
          },
        });
      }

      const autoAgg = await tx.incomeBookEntry.aggregate({
        where: { bookId: book.id },
        _sum: { amount: true, tipAmount: true },
      });
      const manualAgg = await tx.incomeBookManualEntry.aggregate({
        where: { bookId: book.id },
        _sum: { amount: true, tipAmount: true },
      });
      const totalRevenue =
        Number(autoAgg._sum.amount ?? 0) + Number(manualAgg._sum.amount ?? 0);
      const totalTips =
        Number(autoAgg._sum.tipAmount ?? 0) + Number(manualAgg._sum.tipAmount ?? 0);
      await tx.incomeBook.update({
        where: { id: book.id },
        data: { totalRevenue, totalTips },
      });
    });
  }

  async findAll(
    query: { fromDate?: string; toDate?: string; stylistProfileId?: string },
    user: CurrentUserPayload,
  ) {
    const where: {
      date?: { gte?: Date; lte?: Date };
      stylistProfileId?: string;
    } = {};
    if (query.fromDate)
      where.date = { ...where.date, gte: new Date(query.fromDate) };
    if (query.toDate)
      where.date = { ...where.date, lte: new Date(query.toDate) };
    if (query.stylistProfileId) {
      await this.ensureStylistOrAdmin(query.stylistProfileId, user);
      where.stylistProfileId = query.stylistProfileId;
    }
    return this.prisma.dailyLogEntry.findMany({
      where,
      include: this.entryInclude(),
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string, user: CurrentUserPayload) {
    const entry = await this.prisma.dailyLogEntry.findUnique({
      where: { id },
      include: this.entryInclude(),
    });
    if (!entry) throw new NotFoundException('Zapis nije pronađen.');
    await this.ensureStylistOrAdmin(entry.stylistProfileId, user);
    return entry;
  }

  async update(
    id: string,
    dto: UpdateDailyLogEntryDto,
    user: CurrentUserPayload,
  ) {
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
      if (res.status !== 'IN_PROGRESS' && res.status !== 'ATTENDANCE_CONFIRMED') {
        throw new BadRequestException(
          'Rezervaciju nije moguće završiti u trenutnom statusu.',
        );
      }
      await this.prisma.reservation.update({
        where: { id: res.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      // Minimalna loyalty implementacija: osiguraj account
      await this.loyalty.ensureAccountForUser(updated.clientId ?? '').catch(() => {});
    }

    await this.incomeBooks.addEntryFromDailyLog(id).catch(() => {});
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

  private entryInclude() {
    return {
      stylistProfile: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      service: { select: { id: true, name: true } },
      items: {
        orderBy: { sortOrder: 'asc' as const },
        include: { service: { select: { id: true, name: true } } },
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
    };
  }

  private async ensureStylistAccess(
    stylistProfileId: string,
    user: CurrentUserPayload,
  ) {
    const isAdmin =
      user.roles.includes('SYSTEM_ADMIN') || user.roles.includes('OWNER');
    if (isAdmin) return;
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

  /** Javni endpoint: parovi before/after slika iz završenih zapisa (Zadovoljni klijenti). Paginacija: limit (1–50), offset u broju zapisa. */
  async findBeforeAfterPairs(opts?: {
    limit?: number;
    offset?: number;
    serviceId?: string;
  }): Promise<{
    items: {
      id: string;
      service: { id: string; name: string };
      completedAt: Date | null;
      before: {
        pathOriginal: string;
        pathMedium?: string | null;
        pathThumb?: string | null;
      };
      after: {
        pathOriginal: string;
        pathMedium?: string | null;
        pathThumb?: string | null;
      };
    }[];
    hasMore: boolean;
    nextOffset: number;
  }> {
    const limit = Math.min(Math.max(opts?.limit ?? 20, 1), 50);
    const offset = Math.max(opts?.offset ?? 0, 0);
    const serviceId = opts?.serviceId?.trim() || undefined;
    const entries = await this.prisma.dailyLogEntry.findMany({
      where: { status: 'COMPLETED', ...(serviceId ? { serviceId } : {}) },
      include: {
        images: { include: { upload: true }, orderBy: { sortOrder: 'asc' } },
        service: { select: { id: true, name: true } },
      },
      orderBy: { completedAt: 'desc' },
      skip: offset,
      take: limit + 10,
    });
    const pairs: {
      id: string;
      service: { id: string; name: string };
      completedAt: Date | null;
      before: {
        pathOriginal: string;
        pathMedium?: string | null;
        pathThumb?: string | null;
      };
      after: {
        pathOriginal: string;
        pathMedium?: string | null;
        pathThumb?: string | null;
      };
    }[] = [];
    for (const entry of entries) {
      if (pairs.length >= limit) break;
      const beforeImg = entry.images.find((i) => i.isBefore);
      const afterImg = entry.images.find((i) => i.isAfter);
      if (beforeImg?.upload && afterImg?.upload) {
        pairs.push({
          id: entry.id,
          service: entry.service,
          completedAt: entry.completedAt ?? null,
          before: {
            pathOriginal: beforeImg.upload.pathOriginal,
            pathMedium: beforeImg.upload.pathMedium,
            pathThumb: beforeImg.upload.pathThumb,
          },
          after: {
            pathOriginal: afterImg.upload.pathOriginal,
            pathMedium: afterImg.upload.pathMedium,
            pathThumb: afterImg.upload.pathThumb,
          },
        });
      }
    }
    return {
      items: pairs,
      hasMore: pairs.length >= limit,
      nextOffset: offset + entries.length,
    };
  }
}
