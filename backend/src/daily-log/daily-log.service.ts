import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDailyLogEntryDto } from './dto/create-daily-log-entry.dto';
import { UpdateDailyLogEntryDto } from './dto/update-daily-log-entry.dto';
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
    if (dto.reservationId) {
      const res = await this.prisma.reservation.findUnique({
        where: { id: dto.reservationId },
        include: { service: true },
      });
      if (!res) throw new NotFoundException('Rezervacija nije pronađena.');
      if (res.serviceId !== dto.serviceId)
        throw new BadRequestException('Servis se ne podudara s rezervacijom.');
    }
    const date = new Date(dto.date);
    date.setHours(0, 0, 0, 0);
    const created = await this.prisma.dailyLogEntry.create({
      data: {
        stylistProfileId: dto.stylistProfileId,
        reservationId: dto.reservationId,
        serviceId: dto.serviceId,
        clientId: dto.clientId,
        date,
        actualPrice: dto.actualPrice,
        tipAmount: dto.tipAmount ?? 0,
        notes: dto.notes,
        isManual: dto.isManual ?? !!dto.reservationId === false,
        status: 'PENDING',
      },
      include: this.entryInclude(),
    });

    if (
      created.clientId &&
      dto.desiredLoyaltyPercent &&
      dto.desiredLoyaltyPercent > 0
    ) {
      await this.loyalty.redeemForDailyLog({
        clientId: created.clientId,
        dailyLogEntryId: created.id,
        serviceId: created.serviceId,
        desiredPercent: dto.desiredLoyaltyPercent,
        actualPrice: Number(created.actualPrice),
      });
      return this.findOne(created.id, user);
    }

    return created;
  }

  /** Kreira zapis iz rezervacije (nakon COMPLETED ili ručno povezivanje). */
  async createFromReservation(
    reservationId: string,
    actualPrice: number,
    tipAmount: number,
    notes: string | undefined,
    user: CurrentUserPayload,
  ) {
    const res = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { service: true, confirmedStylist: true },
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
    return this.prisma.dailyLogEntry.create({
      data: {
        stylistProfileId: res.confirmedStylistId,
        reservationId: res.id,
        serviceId: res.serviceId,
        clientId: res.clientId,
        date,
        actualPrice,
        tipAmount: tipAmount ?? 0,
        notes,
        isManual: false,
        status: 'PENDING',
      },
      include: this.entryInclude(),
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
      client: { select: { id: true, firstName: true, lastName: true } },
      reservation: { select: { id: true } },
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
