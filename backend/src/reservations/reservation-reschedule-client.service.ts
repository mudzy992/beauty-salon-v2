import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toDateOnlyString } from '../common/utils/date-only';
import { EventsGateway } from '../events/events.gateway';
import { ReservationSharedService } from './reservation-shared.service';
import { ReservationNotifyService } from './reservation-notify.service';
import { ReservationQueriesService } from './reservation-queries.service';
import { RESERVATION_STATUS } from './constants';
import { SOCKET_EVENTS } from '../events/socket-events';
import { assertClientDayBookingAllowed } from './utils/assert-client-day-booking';
import { assertReservationSlotCapacity } from './utils/assert-stylist-slot-capacity';
import {
  acquireReservationDayLock,
  reservationDayKey,
} from './utils/booking-advisory-lock';
import { apiError } from '../common/errors/api-error-codes';

@Injectable()
export class ReservationRescheduleClientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
    private readonly shared: ReservationSharedService,
    private readonly notify: ReservationNotifyService,
    private readonly queries: ReservationQueriesService,
  ) {}

  async acceptReschedule(reservationId: string, userId: string) {
    const snapshot = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { items: { select: { serviceId: true } } },
    });
    if (!snapshot) throw new NotFoundException(apiError('MY_RESERVATIONS_NOT_FOUND'));
    if (snapshot.clientId !== userId)
      throw new ForbiddenException(apiError('MY_RESERVATIONS_NOT_AUTHORIZED_3'));
    if (
      snapshot.status !== RESERVATION_STATUS.CONFIRMED &&
      snapshot.status !== RESERVATION_STATUS.ATTENDANCE_CONFIRMED
    ) {
      throw new BadRequestException(
        'Samo potvrđena rezervacija može prihvatiti promjenu termina.',
      );
    }
    if (snapshot.rescheduleStatus !== 'PENDING')
      throw new BadRequestException(apiError('MY_RESERVATIONS_NO_RESCHEDULE_REQUEST'),
      );
    if (
      !snapshot.rescheduleProposedStartTime ||
      !snapshot.rescheduleProposedEndTime
    ) {
      throw new BadRequestException(apiError('MY_RESERVATIONS_INCOMPLETE_RESCHEDULE'),
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await acquireReservationDayLock(tx, snapshot.reservationDate);
      const current = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: { items: { select: { serviceId: true } } },
      });
      if (!current) throw new NotFoundException(apiError('MY_RESERVATIONS_NOT_FOUND'));
      if (current.clientId !== userId)
        throw new ForbiddenException(apiError('MY_RESERVATIONS_NOT_AUTHORIZED_3'));
      if (current.status !== snapshot.status) {
        throw new ConflictException(
          'Status rezervacije je istovremeno promijenjen. Osvježite podatke i pokušajte ponovo.',
        );
      }
      if (
        current.status !== RESERVATION_STATUS.CONFIRMED &&
        current.status !== RESERVATION_STATUS.ATTENDANCE_CONFIRMED
      ) {
        throw new BadRequestException(
          'Samo potvrđena rezervacija može prihvatiti promjenu termina.',
        );
      }
      if (
        current.reservationDate.getTime() !== snapshot.reservationDate.getTime()
      ) {
        throw new ConflictException(
          'Rezervacija je istovremeno pomjerena. Osvježite termin i pokušajte ponovo.',
        );
      }
      if (current.rescheduleStatus !== 'PENDING')
        throw new BadRequestException(apiError('MY_RESERVATIONS_NO_RESCHEDULE_REQUEST'),
        );
      const nextStart = current.rescheduleProposedStartTime;
      const nextEnd = current.rescheduleProposedEndTime;
      if (!nextStart || !nextEnd) {
        throw new BadRequestException(apiError('MY_RESERVATIONS_INCOMPLETE_RESCHEDULE'),
        );
      }

      const serviceIds =
        current.items.length > 0
          ? current.items.map((item) => item.serviceId)
          : [current.serviceId];
      await assertReservationSlotCapacity({
        db: tx,
        serviceIds,
        date: reservationDayKey(current.reservationDate),
        startTime: nextStart,
        endTime: nextEnd,
        stylistProfileId: current.confirmedStylistId ?? undefined,
        excludeReservationId: current.id,
      });
      await assertClientDayBookingAllowed({
        prisma: tx,
        clientId: current.clientId,
        reservationDate: current.reservationDate,
        startTime: nextStart,
        endTime: nextEnd,
        serviceIds,
        excludeReservationId: current.id,
      });

      const updated = await tx.reservation.updateMany({
        where: {
          id: current.id,
          clientId: userId,
          status: current.status,
          rescheduleStatus: 'PENDING',
          rescheduleProposedStartTime: nextStart,
          rescheduleProposedEndTime: nextEnd,
        },
        data: {
          startTime: nextStart,
          endTime: nextEnd,
          rescheduleStatus: 'ACCEPTED',
          rescheduleProposedStartTime: null,
          rescheduleProposedEndTime: null,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException(
          'Zahtjev za promjenu termina je već obrađen. Osvježite rezervaciju.',
        );
      }
    });

    await this.notify.notifyStylistAboutClientDecision(
      reservationId,
      'accepted',
    );
    return this.queries.findOne(reservationId, {
      sub: userId,
      roles: ['CLIENT'],
      username: '',
      email: '',
    });
  }

  async declineReschedule(reservationId: string, userId: string) {
    const r = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!r) throw new NotFoundException(apiError('MY_RESERVATIONS_NOT_FOUND'));
    if (r.clientId !== userId)
      throw new ForbiddenException(apiError('MY_RESERVATIONS_NOT_AUTHORIZED_3'));
    if (r.rescheduleStatus !== 'PENDING')
      throw new BadRequestException(apiError('MY_RESERVATIONS_NO_RESCHEDULE_REQUEST'),
      );
    const pendingKind =
      await this.notify.getPendingRescheduleKind(reservationId);
    const isReorder = pendingKind === 'reservation_reorder';
    const cancelStatus = !isReorder
      ? this.shared.transitionTo(
          r.status,
          RESERVATION_STATUS.CANCELLED_BY_CLIENT,
        )
      : null;
    const updatedCount = await this.prisma.reservation.updateMany({
      where: {
        id: reservationId,
        clientId: userId,
        status: r.status,
        rescheduleStatus: 'PENDING',
      },
      data: isReorder
        ? {
            rescheduleStatus: 'DECLINED',
            rescheduleProposedStartTime: null,
            rescheduleProposedEndTime: null,
          }
        : {
            status: cancelStatus!,
            cancelledAt: new Date(),
            cancelReason: 'Odbijena izmjena termina',
            rescheduleStatus: 'DECLINED',
            rescheduleProposedStartTime: null,
            rescheduleProposedEndTime: null,
          },
    });
    if (updatedCount.count !== 1) {
      throw new ConflictException(
        'Zahtjev za promjenu termina je već obrađen. Osvježite rezervaciju.',
      );
    }
    const updated = await this.queries.findOne(reservationId, {
      sub: userId,
      roles: ['CLIENT'],
      username: '',
      email: '',
    });
    if (isReorder) {
      this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_UPDATED, updated);
    } else {
      this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_CANCELLED, updated);
      this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
        serviceId: r.serviceId,
        date: toDateOnlyString(r.reservationDate),
      });
    }
    await this.notify.notifyStylistAboutClientDecision(
      reservationId,
      'declined',
    );
    return updated;
  }
}
