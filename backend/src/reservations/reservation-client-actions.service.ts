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
import { ReservationDateService } from './reservation-date.service';
import { ReservationSharedService } from './reservation-shared.service';
import { ReservationQueriesService } from './reservation-queries.service';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { ATTENDANCE_CONFIRMED_BY, RESERVATION_STATUS } from './constants';
import { SOCKET_EVENTS } from '../events/socket-events';
import { NotificationsService } from '../notifications/notifications.service';
import { resolvePushContext } from '../notifications/utils/load-reservation-push-context';
import { buildCancelledCopy } from '../notifications/utils/reservation-push-copy';
import { canConfirmAttendance } from './reservation-policy';
import { apiError } from '../common/errors/api-error-codes';

@Injectable()
export class ReservationClientActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
    private readonly dates: ReservationDateService,
    private readonly shared: ReservationSharedService,
    private readonly queries: ReservationQueriesService,
    private readonly notifications: NotificationsService,
  ) {}

  async cancelByClient(
    id: string,
    clientId: string,
    dto?: CancelReservationDto,
  ) {
    const r = await this.prisma.reservation.findUnique({ where: { id } });
    if (!r) throw new NotFoundException(apiError('MY_RESERVATIONS_NOT_FOUND'));
    if (r.clientId !== clientId)
      throw new ForbiddenException(apiError('MY_RESERVATIONS_NOT_AUTHORIZED'));
    const cancellableStatuses: string[] = [
      RESERVATION_STATUS.PENDING,
      RESERVATION_STATUS.STYLIST_REVIEW,
      RESERVATION_STATUS.CONFIRMED,
      RESERVATION_STATUS.ATTENDANCE_CONFIRMED,
    ];
    if (!cancellableStatuses.includes(r.status))
      throw new BadRequestException(apiError('MY_RESERVATIONS_CANNOT_CANCEL'));
    const salon = await this.prisma.salonSettings.findFirst();
    if (!salon) throw new NotFoundException(apiError('RESERVATIONS_SALON_NOT_CONFIGURED'));
    const reservationStartAt = this.dates.combineDateAndTime(
      r.reservationDate,
      r.startTime,
    );
    const deadline = new Date(
      reservationStartAt.getTime() -
        salon.cancellationDeadlineHours * 60 * 60 * 1000,
    );
    if (new Date() > deadline)
      throw new BadRequestException(apiError('MY_RESERVATIONS_CANCEL_DEADLINE'));
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.updateMany({
        where: { id, clientId, status: r.status },
        data: {
          status: this.shared.transitionTo(
            r.status,
            RESERVATION_STATUS.CANCELLED_BY_CLIENT,
          ),
          cancelledAt: new Date(),
          cancelReason: dto?.cancelReason,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException(apiError('RESERVATIONS_CONCURRENT_CHANGE'),
        );
      }
      await this.shared.incrementCancellationCountInTransaction(
        clientId,
        salon,
        tx,
      );
    });
    const cancelled = await this.queries.findOne(id, {
      sub: clientId,
      roles: ['CLIENT'],
      username: '',
      email: '',
    });
    this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_CANCELLED, cancelled);
    this.events.emitToStylists(SOCKET_EVENTS.RESERVATION_CANCELLED, cancelled);
    this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
      serviceId: r.serviceId,
      date: toDateOnlyString(r.reservationDate),
    });
    if (r.confirmedStylistId) {
      const stylist = await this.prisma.stylistProfile.findUnique({
        where: { id: r.confirmedStylistId },
        select: { userId: true },
      });
      if (stylist?.userId) {
        const ctx = await resolvePushContext(
          this.prisma,
          id,
          r.publicReferenceCode,
        );
        const copy = buildCancelledCopy({
          ctx,
          title: 'Rezervacija otkazana',
          reason: 'Klijent je otkazao rezervaciju.',
        });
        await this.notifications.send({
          userId: stylist.userId,
          title: copy.title,
          body: copy.body,
          type: 'reservation_cancelled',
          data: { reservationId: id, kind: 'stylist_reservation_cancelled' },
          channel: 'PUSH',
        });
      }
    }
    return cancelled;
  }

  async cancelByAdmin(id: string, dto?: CancelReservationDto) {
    const r = await this.prisma.reservation.findUnique({ where: { id } });
    if (!r) throw new NotFoundException(apiError('MY_RESERVATIONS_NOT_FOUND'));
    const nextStatus = this.shared.transitionTo(
      r.status,
      RESERVATION_STATUS.CANCELLED_BY_STYLISTS,
    );
    const updated = await this.prisma.reservation.updateMany({
      where: { id, status: r.status },
      data: {
        status: nextStatus,
        cancelledAt: new Date(),
        cancelReason: dto?.cancelReason,
      },
    });
    if (updated.count !== 1) {
      throw new ConflictException(apiError('RESERVATIONS_CONCURRENT_CHANGE'),
      );
    }
    const cancelled = await this.queries.findOne(id, {
      sub: '',
      roles: ['SYSTEM_ADMIN'],
      username: '',
      email: '',
    });
    this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_CANCELLED, cancelled);
    this.events.emitToStylists(SOCKET_EVENTS.RESERVATION_CANCELLED, cancelled);
    this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
      serviceId: r.serviceId,
      date: toDateOnlyString(r.reservationDate),
    });
    if (r.clientId) {
      const ctx = await resolvePushContext(
        this.prisma,
        id,
        r.publicReferenceCode,
      );
      const copy = buildCancelledCopy({
        ctx,
        title: 'Rezervacija otkazana',
        reason:
          dto?.cancelReason?.trim() ||
          'Rezervacija je otkazana od strane salona.',
      });
      await this.notifications.send({
        userId: r.clientId,
        title: copy.title,
        body: copy.body,
        type: 'reservation_cancelled',
        data: {
          reservationId: id,
          kind: 'reservation_cancelled',
          publicReferenceCode: r.publicReferenceCode,
          clientViewToken: r.clientViewToken,
        },
        channel: 'PUSH',
      });
    }
    return cancelled;
  }

  async confirmAttendance(id: string, clientId: string) {
    const r = await this.prisma.reservation.findUnique({ where: { id } });
    if (!r) throw new NotFoundException(apiError('MY_RESERVATIONS_NOT_FOUND'));
    if (r.clientId !== clientId)
      throw new ForbiddenException(apiError('MY_RESERVATIONS_NOT_AUTHORIZED_2'));
    if (!canConfirmAttendance(r)) {
      throw new BadRequestException(apiError('MY_RESERVATIONS_AWAITING_STYLIST'),
      );
    }
    const salon = await this.prisma.salonSettings.findFirst();
    if (!salon) throw new NotFoundException(apiError('RESERVATIONS_SALON_NOT_CONFIGURED'));
    const reservationStartAt = this.dates.combineDateAndTime(
      r.reservationDate,
      r.startTime,
    );
    const deadlineHours = await this.dates.getAttendanceConfirmDeadlineHours();
    const attendanceDeadline = new Date(
      reservationStartAt.getTime() - deadlineHours * 60 * 60 * 1000,
    );
    const now = new Date();
    if (now.getTime() >= attendanceDeadline.getTime()) {
      throw new BadRequestException(
        `Rok za potvrdu dolaska je istekao (najkasnije ${deadlineHours}h prije termina).`,
      );
    }
    const updated = await this.prisma.reservation.updateMany({
      where: { id, clientId, status: r.status },
      data: {
        status: this.shared.transitionTo(
          r.status,
          RESERVATION_STATUS.ATTENDANCE_CONFIRMED,
        ),
        attendanceConfirmedAt: now,
        attendanceConfirmedBy: ATTENDANCE_CONFIRMED_BY.CLIENT,
      },
    });
    if (updated.count !== 1) {
      throw new ConflictException(apiError('RESERVATIONS_CONCURRENT_CHANGE'),
      );
    }
    const confirmed = await this.queries.findOne(id, {
      sub: clientId,
      roles: ['CLIENT'],
      username: '',
      email: '',
    });
    this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_UPDATED, confirmed);
    return confirmed;
  }
}
