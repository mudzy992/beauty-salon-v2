import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  getDateOnlyDayBounds,
  toDateOnlyString,
} from '../common/utils/date-only';
import { EventsGateway } from '../events/events.gateway';
import { ReservationDateService } from './reservation-date.service';
import { ReservationQueriesService } from './reservation-queries.service';
import { ReservationNotifyService } from './reservation-notify.service';
import { ReservationSharedService } from './reservation-shared.service';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import {
  RESERVATION_STATUS,
  SLOT_HOLD_INBOX_STATUSES,
  SLOT_OCCUPYING_STATUSES,
} from './constants';
import { SOCKET_EVENTS } from '../events/socket-events';
import { isActiveLock } from './utils/slot-hold.utils';
import { timeToMinutes } from './utils/time-slot.utils';
import { assertAdminSlotWithinWorkingHours } from './utils/assert-admin-working-hours';
import { assertClientDayBookingAllowed } from './utils/assert-client-day-booking';
import { assertReservationSlotCapacity } from './utils/assert-stylist-slot-capacity';
import {
  acquireReservationDayLocks,
  reservationDayKey,
} from './utils/booking-advisory-lock';
import { closePendingDailyLogForReorder } from './utils/close-pending-daily-log';

@Injectable()
export class ReservationUpdateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
    private readonly dates: ReservationDateService,
    private readonly queries: ReservationQueriesService,
    private readonly notify: ReservationNotifyService,
    private readonly shared: ReservationSharedService,
  ) {}

  async updateByAdmin(reservationId: string, dto: UpdateReservationDto) {
    const snapshot = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        reservationDate: true,
        startTime: true,
        endTime: true,
        status: true,
        confirmedStylistId: true,
        serviceId: true,
        clientId: true,
        publicReferenceCode: true,
        clientViewToken: true,
      },
    });
    if (!snapshot) {
      throw new NotFoundException('Rezervacija nije pronađena.');
    }

    const requestedDate = dto.reservationDate
      ? this.dates.parseDateOnly(dto.reservationDate)
      : this.dates.parseDateOnly(
          this.dates.toDateOnlyString(snapshot.reservationDate),
        );

    const updatedContext = await this.prisma.$transaction(async (tx) => {
      await acquireReservationDayLocks(tx, [
        snapshot.reservationDate,
        requestedDate,
      ]);
      const current = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: {
          items: { select: { serviceId: true } },
          stylistResponses: {
            select: {
              stylistProfileId: true,
              status: true,
              lockExpiresAt: true,
            },
          },
        },
      });
      if (!current) {
        throw new NotFoundException('Rezervacija nije pronađena.');
      }
      if (
        current.reservationDate.getTime() !==
          snapshot.reservationDate.getTime() ||
        current.startTime !== snapshot.startTime ||
        current.endTime !== snapshot.endTime ||
        current.status !== snapshot.status ||
        current.confirmedStylistId !== snapshot.confirmedStylistId
      ) {
        throw new ConflictException(
          'Termin je istovremeno promijenjen. Osvježite rezervaciju i pokušajte ponovo.',
        );
      }

      const nextDate = dto.reservationDate
        ? this.dates.parseDateOnly(dto.reservationDate)
        : this.dates.parseDateOnly(
            this.dates.toDateOnlyString(current.reservationDate),
          );
      const nextStartTime = (dto.startTime ?? current.startTime).trim();
      const nextEndTime = (dto.endTime ?? current.endTime).trim();
      if (!nextStartTime || !nextEndTime) {
        throw new BadRequestException('Neispravno vrijeme termina.');
      }
      if (timeToMinutes(nextEndTime) <= timeToMinutes(nextStartTime)) {
        throw new BadRequestException(
          'Vrijeme završetka mora biti nakon početka.',
        );
      }

      await assertAdminSlotWithinWorkingHours({
        prisma: tx,
        reservationDate: nextDate,
        startTime: nextStartTime,
        endTime: nextEndTime,
        confirmedStylistId: current.confirmedStylistId,
      });

      const serviceIds =
        current.items.length > 0
          ? current.items.map((item) => item.serviceId)
          : [current.serviceId];
      await assertClientDayBookingAllowed({
        prisma: tx,
        clientId: current.clientId,
        reservationDate: nextDate,
        startTime: nextStartTime,
        endTime: nextEndTime,
        serviceIds,
        excludeReservationId: current.id,
      });

      const normalizedNextDate = this.dates.toDateOnlyString(nextDate);
      const scheduleChanged =
        this.dates.toDateOnlyString(current.reservationDate) !==
          normalizedNextDate ||
        current.startTime.trim().slice(0, 5) !== nextStartTime.slice(0, 5) ||
        current.endTime.trim().slice(0, 5) !== nextEndTime.slice(0, 5);
      const leaveDailyLog =
        scheduleChanged &&
        current.status === RESERVATION_STATUS.AWAITING_DAILY_LOG;
      const consumesOrWillConsumeCapacity =
        SLOT_OCCUPYING_STATUSES.includes(
          current.status as (typeof SLOT_OCCUPYING_STATUSES)[number],
        ) ||
        SLOT_HOLD_INBOX_STATUSES.includes(
          current.status as (typeof SLOT_HOLD_INBOX_STATUSES)[number],
        ) ||
        leaveDailyLog;

      if (consumesOrWillConsumeCapacity) {
        const activeLock = current.stylistResponses.find((response) =>
          isActiveLock(response),
        );
        await assertReservationSlotCapacity({
          db: tx,
          serviceIds,
          date: reservationDayKey(nextDate),
          startTime: nextStartTime,
          endTime: nextEndTime,
          stylistProfileId:
            current.confirmedStylistId ?? activeLock?.stylistProfileId,
          excludeReservationId: current.id,
        });
      } else if (current.confirmedStylistId) {
        const { gte, lt } = getDateOnlyDayBounds(
          this.dates.toDateOnlyString(nextDate),
        );
        const conflict = await tx.reservation.findFirst({
          where: {
            id: { not: current.id },
            confirmedStylistId: current.confirmedStylistId,
            reservationDate: { gte, lt },
            status: { in: [...SLOT_OCCUPYING_STATUSES] as any },
            startTime: { lt: nextEndTime },
            endTime: { gt: nextStartTime },
          },
          select: { id: true, startTime: true, endTime: true },
        });
        if (conflict) {
          throw new BadRequestException(
            `Preklapanje sa drugim terminom (${conflict.startTime}–${conflict.endTime}).`,
          );
        }
      }

      const data = leaveDailyLog
        ? {
            reservationDate: nextDate,
            startTime: nextStartTime,
            endTime: nextEndTime,
            status: this.shared.transitionTo(
              current.status,
              RESERVATION_STATUS.CONFIRMED,
            ),
            rescheduleStatus: null,
            rescheduleProposedStartTime: null,
            rescheduleProposedEndTime: null,
          }
        : {
            reservationDate: nextDate,
            startTime: nextStartTime,
            endTime: nextEndTime,
          };
      const result = await tx.reservation.updateMany({
        where: {
          id: current.id,
          reservationDate: current.reservationDate,
          startTime: current.startTime,
          endTime: current.endTime,
          status: current.status,
          confirmedStylistId: current.confirmedStylistId,
        },
        data,
      });
      if (result.count !== 1) {
        throw new ConflictException(
          'Termin je istovremeno promijenjen. Osvježite rezervaciju i pokušajte ponovo.',
        );
      }
      if (leaveDailyLog) {
        await closePendingDailyLogForReorder(tx, current.id);
      }

      return {
        clientId: current.clientId,
        serviceId: current.serviceId,
        publicReferenceCode: current.publicReferenceCode,
        clientViewToken: current.clientViewToken,
        nextDateStr: normalizedNextDate,
        nextStartTime,
        nextEndTime,
        scheduleChanged,
      };
    });

    const full = await this.queries.findOne(reservationId, {
      sub: '',
      roles: ['SYSTEM_ADMIN'],
      username: '',
      email: '',
    });
    this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_UPDATED, full);
    this.events.emitToUser(
      updatedContext.clientId,
      SOCKET_EVENTS.RESERVATION_UPDATED,
      full,
    );
    this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
      serviceId: updatedContext.serviceId,
      date: updatedContext.nextDateStr,
    });
    if (updatedContext.scheduleChanged) {
      await this.notify.notifyClientTimeChanged({
        clientId: updatedContext.clientId,
        reservationId: snapshot.id,
        date: updatedContext.nextDateStr,
        startTime: updatedContext.nextStartTime.slice(0, 5),
        endTime: updatedContext.nextEndTime.slice(0, 5),
        publicReferenceCode: updatedContext.publicReferenceCode,
        clientViewToken: updatedContext.clientViewToken,
      });
    }
    return full;
  }
}
