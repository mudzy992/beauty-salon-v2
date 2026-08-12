import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../events/events.gateway';
import { ReservationDateService } from './reservation-date.service';
import { ReservationSharedService } from './reservation-shared.service';
import { ReservationQueriesService } from './reservation-queries.service';
import {
  RESERVATION_STATUS,
} from './constants';
import { SOCKET_EVENTS } from '../events/socket-events';

@Injectable()
export class ReservationAttendanceCronService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly events: EventsGateway,
    private readonly dates: ReservationDateService,
    private readonly shared: ReservationSharedService,
    private readonly queries: ReservationQueriesService,
  ) {}

  async processAttendanceDeadlines() {
    const salon = await this.prisma.salonSettings.findFirst();
    if (!salon) return { cancelledCount: 0 };
    const now = new Date();
    const today = this.dates.parseDateOnly(now);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const dayAfterTomorrow = new Date(
      tomorrow.getTime() + 24 * 60 * 60 * 1000,
    );
    const candidates = await this.prisma.reservation.findMany({
      where: {
        status: RESERVATION_STATUS.CONFIRMED,
        attendanceConfirmedAt: null,
        reservationDate: { gte: today, lt: dayAfterTomorrow },
      },
      select: {
        id: true,
        clientId: true,
        serviceId: true,
        reservationDate: true,
        startTime: true,
        confirmedStylistId: true,
      },
      orderBy: [{ reservationDate: 'asc' }, { startTime: 'asc' }],
    });
    let cancelledCount = 0;
    const deadlineHours = await this.dates.getAttendanceConfirmDeadlineHours();
    for (const r of candidates) {
      const reservationStartAt = this.dates.combineDateAndTime(
        r.reservationDate,
        r.startTime,
      );
      const attendanceDeadline = new Date(
        reservationStartAt.getTime() - deadlineHours * 60 * 60 * 1000,
      );
      if (now.getTime() < attendanceDeadline.getTime()) continue;
      const nextStatus = this.shared.transitionTo(
        RESERVATION_STATUS.CONFIRMED,
        RESERVATION_STATUS.CANCELLED_BY_CLIENT,
      );
      const updatedRow = await this.prisma.reservation.updateMany({
        where: {
          id: r.id,
          status: RESERVATION_STATUS.CONFIRMED,
          attendanceConfirmedAt: null,
        },
        data: {
          status: nextStatus,
          cancelledAt: now,
          cancelReason: 'Nije potvrđen dolazak u roku',
        },
      });
      if (updatedRow.count === 0) continue;
      cancelledCount++;
      await this.shared.incrementCancellationCount(r.clientId, {
        maxCancellationsBeforePenalty:
          salon.maxCancellationsBeforePenalty,
        penaltyDurationDays: salon.penaltyDurationDays,
      });
      await this.notifications.send({
        userId: r.clientId,
        title: 'Termin je otkazan',
        body: 'Termin je otkazan jer dolazak nije potvrđen u predviđenom roku.',
        type: 'reservation_cancelled',
        data: {
          kind: 'attendance_timeout_cancelled',
          reservationId: r.id,
        },
        channel: 'PUSH',
      });
      const cancelled = await this.queries.findOne(r.id, {
        sub: r.clientId,
        roles: ['CLIENT'],
        username: '',
        email: '',
      });
      this.events.emitToAdmins(
        SOCKET_EVENTS.RESERVATION_CANCELLED,
        cancelled,
      );
      this.events.emitToStylists(
        SOCKET_EVENTS.RESERVATION_CANCELLED,
        cancelled,
      );
      this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
        serviceId: r.serviceId,
        date: r.reservationDate,
      });
    }
    return { cancelledCount };
  }
}
