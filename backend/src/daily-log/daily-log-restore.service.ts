import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DailyLogService } from './daily-log.service';
import { IncomeSyncService } from '../finance/income-sync.service';
import { ReservationSharedService } from '../reservations/reservation-shared.service';
import { ReservationDateService } from '../reservations/reservation-date.service';
import {
  ATTENDANCE_CONFIRMED_BY,
  RESERVATION_ACCEPTANCE_MODE,
  RESERVATION_ATTENDANCE_POLICY,
  RESERVATION_BOOKING_ORIGIN,
  RESERVATION_STATUS,
  SLOT_OCCUPYING_STATUSES,
} from '../reservations/constants';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import type { RestoreDailyLogEntryDto } from './dto/restore-daily-log-entry.dto';

@Injectable()
export class DailyLogRestoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dailyLog: DailyLogService,
    private readonly incomeSync: IncomeSyncService,
    private readonly shared: ReservationSharedService,
    private readonly dates: ReservationDateService,
  ) {}

  async restore(
    id: string,
    dto: RestoreDailyLogEntryDto,
    user: CurrentUserPayload,
  ) {
    if (!this.dailyLog.isAdminOrOwner(user)) {
      throw new ForbiddenException('Nemate dozvolu.');
    }
    const entry = await this.prisma.dailyLogEntry.findUnique({
      where: { id },
      include: {
        ...this.dailyLog.entryInclude(),
        reservation: {
          select: {
            id: true,
            status: true,
            bookingOrigin: true,
            acceptanceMode: true,
            attendancePolicy: true,
            confirmedStylistId: true,
            startTime: true,
            endTime: true,
            serviceId: true,
            clientId: true,
          },
        },
      },
    });
    if (!entry) throw new NotFoundException('Zapis nije pronađen.');
    if (!entry.deletedAt) throw new BadRequestException('Zapis nije obrisan.');

    const targetDate = dto.date
      ? this.dates.parseDateOnly(dto.date)
      : new Date(entry.date);

    const isFutureDate = this.isFuture(targetDate);
    const hasReservation = !!entry.reservation;

    if (hasReservation && isFutureDate && !entry.isManual) {
      return this.restoreAsReservation(entry, targetDate, user);
    }

    await this.incomeSync.assertBookOpenForDate(targetDate);
    return this.prisma.dailyLogEntry.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedById: null,
        deleteReason: null,
        status: 'PENDING',
        completedAt: null,
        date: targetDate,
      },
      include: this.dailyLog.entryInclude(),
    });
  }

  private isFuture(date: Date): boolean {
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    return date.getTime() > today.getTime();
  }

  private async restoreAsReservation(
    entry: Awaited<ReturnType<typeof this.prisma.dailyLogEntry.findUnique>> & {
      reservation: {
        id: string;
        status: string;
        bookingOrigin: string;
        acceptanceMode: string;
        attendancePolicy: string;
        confirmedStylistId: string | null;
        startTime: string;
        endTime: string;
        serviceId: string;
        clientId: string | null;
      } | null;
    },
    targetDate: Date,
    user: CurrentUserPayload,
  ) {
    const res = entry.reservation!;
    const isDirect =
      res.acceptanceMode === RESERVATION_ACCEPTANCE_MODE.DIRECT_ASSIGN;

    const serviceIds = entry.items?.length
      ? entry.items.map((i) => i.serviceId)
      : [entry.serviceId].filter(Boolean) as string[];

    if (!entry.clientId) {
      throw new BadRequestException(
        'Zapis nema klijenta, nije moguće kreirati rezervaciju.',
      );
    }
    if (!res.confirmedStylistId) {
      throw new BadRequestException(
        'Zapis nema stilista, nije moguće kreirati rezervaciju.',
      );
    }

    await this.assertNoStylistConflict(
      res.confirmedStylistId,
      targetDate,
      res.startTime,
      res.endTime,
    );

    const { publicReferenceCode, clientViewToken } =
      await this.shared.allocateReservationPublicCodes(targetDate);

    const newStatus = isDirect
      ? RESERVATION_STATUS.CONFIRMED
      : RESERVATION_STATUS.PENDING;

    const newReservation = await this.prisma.reservation.create({
      data: {
        clientId: entry.clientId,
        serviceId: serviceIds[0]!,
        reservationDate: targetDate,
        startTime: res.startTime,
        endTime: res.endTime,
        status: newStatus,
        bookingOrigin: res.bookingOrigin as any,
        acceptanceMode: res.acceptanceMode as any,
        attendancePolicy: res.attendancePolicy as any,
        createdByUserId: user.sub,
        confirmedStylistId: isDirect ? res.confirmedStylistId : null,
        ...(isDirect && {
          attendanceWaivedAt: new Date(),
          attendanceWaivedByUserId: user.sub,
          attendanceConfirmedBy: ATTENDANCE_CONFIRMED_BY.STAFF,
        }),
        publicReferenceCode,
        clientViewToken,
      },
    });

    if (serviceIds.length > 1) {
      await this.prisma.reservationServiceItem.createMany({
        data: serviceIds.map((sid, idx) => ({
          reservationId: newReservation.id,
          serviceId: sid,
          sortOrder: idx,
        })),
      });
    }

    return this.prisma.dailyLogEntry.update({
      where: { id: entry.id },
      data: {
        deletedAt: null,
        deletedById: null,
        deleteReason: null,
        status: 'PENDING',
        completedAt: null,
        date: targetDate,
        reservationId: newReservation.id,
      },
      include: this.dailyLog.entryInclude(),
    });
  }

  private async assertNoStylistConflict(
    stylistProfileId: string,
    date: Date,
    startTime: string,
    endTime: string,
  ) {
    const dayStart = new Date(date);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setUTCHours(23, 59, 59, 999);
    const conflict = await this.prisma.reservation.findFirst({
      where: {
        confirmedStylistId: stylistProfileId,
        reservationDate: { gte: dayStart, lte: dayEnd },
        status: { in: [...SLOT_OCCUPYING_STATUSES] as any },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { startTime: true, endTime: true },
    });
    if (conflict) {
      throw new BadRequestException(
        `Stilist ima konflikt termina (${conflict.startTime}–${conflict.endTime}).`,
      );
    }
  }
}
