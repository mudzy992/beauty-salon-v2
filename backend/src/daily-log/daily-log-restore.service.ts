import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DailyLogService } from './daily-log.service';
import { IncomeSyncService } from '../finance/income-sync.service';
import { ReservationSharedService } from '../reservations/reservation-shared.service';
import { ReservationDateService } from '../reservations/reservation-date.service';
import {
  ATTENDANCE_CONFIRMED_BY,
  RESERVATION_ACCEPTANCE_MODE,
  RESERVATION_STATUS,
  SLOT_OCCUPYING_STATUSES,
} from '../reservations/constants';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import type { RestoreDailyLogEntryDto } from './dto/restore-daily-log-entry.dto';
import {
  getDateOnlyDayBounds,
  toDateOnlyString,
} from '../common/utils/date-only';
import { assertClientDayBookingAllowed } from '../reservations/utils/assert-client-day-booking';
import { acquireReservationDayLock } from '../reservations/utils/booking-advisory-lock';

interface EntryReservationSnapshot {
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
}

interface EntryForRestore {
  id: string;
  date: Date;
  clientId: string | null;
  serviceId: string;
  isManual: boolean;
  deletedAt: Date | null;
  items: Array<{ serviceId: string }>;
  reservation: EntryReservationSnapshot | null;
}

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
    const entry = (await this.prisma.dailyLogEntry.findUnique({
      where: { id },
      select: {
        id: true,
        date: true,
        clientId: true,
        serviceId: true,
        isManual: true,
        deletedAt: true,
        items: { select: { serviceId: true } },
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
    })) as EntryForRestore | null;
    if (!entry) throw new NotFoundException('Zapis nije pronađen.');
    if (!entry.deletedAt) throw new BadRequestException('Zapis nije obrisan.');

    const targetDate = dto.date
      ? this.dates.parseDateOnly(dto.date)
      : new Date(entry.date);

    const hasReservation = !!entry.reservation && !entry.isManual;

    if (hasReservation && this.isFuture(targetDate)) {
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
    const today = this.dates.toSalonDateOnlyString(new Date());
    return toDateOnlyString(date) > today;
  }

  private async restoreAsReservation(
    entry: EntryForRestore,
    targetDate: Date,
    user: CurrentUserPayload,
  ) {
    const res = entry.reservation!;
    const isDirect =
      res.acceptanceMode === RESERVATION_ACCEPTANCE_MODE.DIRECT_ASSIGN;

    const serviceIds: string[] = entry.items.length
      ? entry.items.map((i: { serviceId: string }) => i.serviceId)
      : [entry.serviceId].filter((s): s is string => !!s);

    const clientId = entry.clientId;
    if (!clientId) {
      throw new BadRequestException(
        'Zapis nema klijenta, nije moguće kreirati rezervaciju.',
      );
    }
    const confirmedStylistId = res.confirmedStylistId;
    if (!confirmedStylistId) {
      throw new BadRequestException(
        'Zapis nema stilista, nije moguće kreirati rezervaciju.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM "daily_log_entries" WHERE id = ${entry.id} FOR UPDATE`,
      );
      const current = await tx.dailyLogEntry.findUnique({
        where: { id: entry.id },
        select: { id: true, deletedAt: true },
      });
      if (!current?.deletedAt) {
        throw new BadRequestException('Zapis više nije obrisan.');
      }

      // Coordinate with normal reservation creation and recheck availability
      // after taking the same salon-day transaction lock.
      await acquireReservationDayLock(tx, targetDate);
      await this.assertNoStylistConflict(
        tx,
        confirmedStylistId,
        targetDate,
        res.startTime,
        res.endTime,
      );
      await assertClientDayBookingAllowed({
        prisma: tx,
        clientId,
        reservationDate: targetDate,
        startTime: res.startTime,
        endTime: res.endTime,
        serviceIds,
      });

      const { publicReferenceCode, clientViewToken } =
        await this.shared.allocateReservationPublicCodes(targetDate, tx);

      const newStatus = isDirect
        ? RESERVATION_STATUS.CONFIRMED
        : RESERVATION_STATUS.PENDING;

      const newReservation = await tx.reservation.create({
        data: {
          clientId,
          serviceId: serviceIds[0]!,
          reservationDate: targetDate,
          startTime: res.startTime,
          endTime: res.endTime,
          status: newStatus,
          bookingOrigin: res.bookingOrigin as any,
          acceptanceMode: res.acceptanceMode as any,
          attendancePolicy: res.attendancePolicy as any,
          createdByUserId: user.sub,
          confirmedStylistId: isDirect ? confirmedStylistId : null,
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
        await tx.reservationServiceItem.createMany({
          data: serviceIds.map((sid: string, idx: number) => ({
            reservationId: newReservation.id,
            serviceId: sid,
            sortOrder: idx,
          })),
        });
      }

      return tx.dailyLogEntry.update({
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
    });
  }

  private async assertNoStylistConflict(
    db: Pick<Prisma.TransactionClient, 'reservation'>,
    stylistProfileId: string,
    date: Date,
    startTime: string,
    endTime: string,
  ) {
    const { gte, lt } = getDateOnlyDayBounds(toDateOnlyString(date));
    const conflict = await db.reservation.findFirst({
      where: {
        confirmedStylistId: stylistProfileId,
        reservationDate: { gte, lt },
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
