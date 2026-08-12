import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { ReservationDateService } from './reservation-date.service';
import { ReservationSharedService } from './reservation-shared.service';
import { ReservationQueriesService } from './reservation-queries.service';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import {
  RESERVATION_STATUS,
} from './constants';
import { SOCKET_EVENTS } from '../events/socket-events';
import { NotificationsService } from '../notifications/notifications.service';

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
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    if (r.clientId !== clientId)
      throw new ForbiddenException(
        'Samo klijent može otkazati rezervaciju.',
      );
    const cancellableStatuses: string[] = [
      RESERVATION_STATUS.PENDING,
      RESERVATION_STATUS.STYLIST_REVIEW,
      RESERVATION_STATUS.CONFIRMED,
      RESERVATION_STATUS.ATTENDANCE_CONFIRMED,
    ];
    if (!cancellableStatuses.includes(r.status))
      throw new BadRequestException(
        'Rezervacija se više ne može otkazati.',
      );
    const salon = await this.prisma.salonSettings.findFirst();
    if (!salon) throw new NotFoundException('Salon nije konfigurisan.');
    const reservationStartAt = this.dates.combineDateAndTime(
      r.reservationDate,
      r.startTime,
    );
    const deadline = new Date(
      reservationStartAt.getTime() -
        salon.cancellationDeadlineHours * 60 * 60 * 1000,
    );
    if (new Date() > deadline)
      throw new BadRequestException('Rok za otkazivanje je istekao.');
    await this.prisma.reservation.update({
      where: { id },
      data: {
        status: this.shared.transitionTo(
          r.status,
          RESERVATION_STATUS.CANCELLED_BY_CLIENT,
        ),
        cancelledAt: new Date(),
        cancelReason: dto?.cancelReason,
      },
    });
    await this.shared.incrementCancellationCount(clientId, salon);
    const cancelled = await this.queries.findOne(id, {
      sub: clientId,
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
    if (r.confirmedStylistId) {
      const stylist = await this.prisma.stylistProfile.findUnique({
        where: { id: r.confirmedStylistId },
        select: { userId: true },
      });
      if (stylist?.userId) {
        await this.notifications.send({
          userId: stylist.userId,
          title: 'Rezervacija otkazana',
          body: 'Klijent je otkazao rezervaciju.',
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
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    const nextStatus = this.shared.transitionTo(
      r.status,
      RESERVATION_STATUS.CANCELLED_BY_STYLISTS,
    );
    await this.prisma.reservation.update({
      where: { id },
      data: {
        status: nextStatus,
        cancelledAt: new Date(),
        cancelReason: dto?.cancelReason,
      },
    });
    const cancelled = await this.queries.findOne(id, {
      sub: '',
      roles: ['SYSTEM_ADMIN'],
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
    if (r.clientId) {
      await this.notifications.send({
        userId: r.clientId,
        title: 'Rezervacija otkazana',
        body: dto?.cancelReason?.trim() || 'Rezervacija je otkazana od strane salona.',
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
    const r = await this.prisma.reservation.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    if (r.clientId !== clientId)
      throw new ForbiddenException(
        'Samo klijent može potvrditi dolazak.',
      );
    if (r.status !== RESERVATION_STATUS.CONFIRMED) {
      throw new BadRequestException(
        'Rezervacija mora biti potvrđena od strane stilista.',
      );
    }
    const salon = await this.prisma.salonSettings.findFirst();
    if (!salon) throw new NotFoundException('Salon nije konfigurisan.');
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
    await this.prisma.reservation.update({
      where: { id },
      data: {
        status: this.shared.transitionTo(
          r.status,
          RESERVATION_STATUS.ATTENDANCE_CONFIRMED,
        ),
        attendanceConfirmedAt: now,
      },
    });
    const confirmed = await this.queries.findOne(id, {
      sub: clientId,
      roles: ['CLIENT'],
      username: '',
      email: '',
    });
    this.events.emitToAdmins(
      SOCKET_EVENTS.RESERVATION_UPDATED,
      confirmed,
    );
    return confirmed;
  }
}
