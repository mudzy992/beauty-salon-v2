import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { resolvePushContext } from '../notifications/utils/load-reservation-push-context';
import { buildCancelledCopy } from '../notifications/utils/reservation-push-copy';
import { EventsGateway } from '../events/events.gateway';
import { ReservationSharedService } from './reservation-shared.service';
import { ReservationQueriesService } from './reservation-queries.service';
import { RESERVATION_STATUS } from './constants';
import { SOCKET_EVENTS } from '../events/socket-events';
import type { StylistNoShowDto } from './dto/stylist-no-show.dto';

@Injectable()
export class ReservationRuntimeCancelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly events: EventsGateway,
    private readonly shared: ReservationSharedService,
    private readonly queries: ReservationQueriesService,
  ) {}

  async stylistCancel(
    reservationId: string,
    userId: string,
    dto: { cancelReason?: string },
  ) {
    const stylistProfileId =
      await this.shared.getStylistProfileIdByUserId(userId);
    if (!stylistProfileId)
      throw new ForbiddenException('Nemate profil stilista.');
    const r = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    if (r.confirmedStylistId !== stylistProfileId) {
      throw new ForbiddenException(
        'Samo potvrđeni stilist može otkazati ovu rezervaciju.',
      );
    }
    const cancellableByStylist = [
      RESERVATION_STATUS.CONFIRMED,
      RESERVATION_STATUS.IN_PROGRESS,
    ];
    if (!cancellableByStylist.includes(r.status as any)) {
      throw new BadRequestException(
        'Samo potvrđene ili u toku rezervacije mogu se otkazati. Završene označite preko "Završi i upiši u dnevnu knjigu".',
      );
    }
    const reason = (dto?.cancelReason ?? '').trim();
    if (!reason)
      throw new BadRequestException(
        'Obrazloženje otkazivanja je obavezno.',
      );
    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: this.shared.transitionTo(
          r.status,
          RESERVATION_STATUS.CANCELLED_BY_STYLISTS,
        ),
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });
    const cancelled = await this.queries.findOne(reservationId, {
      sub: userId,
      roles: ['STYLIST'],
      username: '',
      email: '',
    });
    this.events.emitToAdmins(
      SOCKET_EVENTS.RESERVATION_CANCELLED,
      cancelled,
    );
    this.events.emitToUser(
      r.clientId,
      SOCKET_EVENTS.RESERVATION_UPDATED,
      cancelled,
    );
    this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
      serviceId: r.serviceId,
      date: r.reservationDate,
    });
    const resWithClient = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        clientId: true,
        publicReferenceCode: true,
        clientViewToken: true,
      },
    });
    if (resWithClient?.clientId) {
      const ctx = await resolvePushContext(
        this.prisma,
        reservationId,
        resWithClient.publicReferenceCode,
      );
      const copy = buildCancelledCopy({
        ctx,
        title: 'Rezervacija otkazana',
        reason: reason.trim() || 'Rezervacija je otkazana.',
      });
      await this.notifications.send({
        userId: resWithClient.clientId,
        title: copy.title,
        body: copy.body,
        type: 'reservation_cancelled',
        data: {
          reservationId,
          kind: 'reservation_cancelled',
          publicReferenceCode: resWithClient.publicReferenceCode,
          clientViewToken: resWithClient.clientViewToken,
        },
        channel: 'PUSH',
      });
    }
    return cancelled;
  }

  async stylistMarkNoShow(
    reservationId: string,
    userId: string,
    dto: StylistNoShowDto,
  ) {
    const stylistProfileId =
      await this.shared.getStylistProfileIdByUserId(userId);
    if (!stylistProfileId)
      throw new ForbiddenException('Nemate profil stilista.');
    const r = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        clientId: true,
        serviceId: true,
        reservationDate: true,
        confirmedStylistId: true,
        status: true,
      },
    });
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    if (r.confirmedStylistId !== stylistProfileId)
      throw new ForbiddenException(
        'Samo potvrđeni stilist može označiti no-show.',
      );
    const allowedStatuses: string[] = [
      RESERVATION_STATUS.CONFIRMED,
      RESERVATION_STATUS.ATTENDANCE_CONFIRMED,
    ];
    if (!allowedStatuses.includes(r.status)) {
      throw new BadRequestException(
        'No-show možete označiti samo za potvrđene termine (prije startovanja).',
      );
    }
    const reason = (dto?.reason ?? '').trim();
    if (!reason)
      throw new BadRequestException('Obrazloženje je obavezno.');
    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: this.shared.transitionTo(
          r.status,
          RESERVATION_STATUS.NO_SHOW,
        ),
        cancelledAt: new Date(),
        cancelReason: reason,
        rescheduleStatus: null,
        rescheduleProposedStartTime: null,
        rescheduleProposedEndTime: null,
      },
    });
    if (dto?.applyPenalty !== false) {
      const salon = await this.prisma.salonSettings.findFirst();
      if (salon) {
        await this.shared.incrementCancellationCount(r.clientId, {
          maxCancellationsBeforePenalty:
            salon.maxCancellationsBeforePenalty,
          penaltyDurationDays: salon.penaltyDurationDays,
        });
      }
    }
    const updated = await this.queries.findOne(reservationId, {
      sub: userId,
      roles: ['STYLIST'],
      username: '',
      email: '',
    });
    this.events.emitToAdmins(
      SOCKET_EVENTS.RESERVATION_CANCELLED,
      updated,
    );
    this.events.emitToUser(
      r.clientId,
      SOCKET_EVENTS.RESERVATION_UPDATED,
      updated,
    );
    this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
      serviceId: r.serviceId,
      date: r.reservationDate,
    });
    const ctx = await resolvePushContext(this.prisma, reservationId);
    const copy = buildCancelledCopy({
      ctx,
      title: 'Niste došli',
      reason: 'Rezervacija je označena kao da se klijent nije pojavio. Ako je greška, kontaktirajte salon.',
    });
    await this.notifications.send({
      userId: r.clientId,
      title: copy.title,
      body: copy.body,
      type: 'reservation_cancelled',
      data: { reservationId, kind: 'reservation_cancelled' },
      channel: 'PUSH',
    });
    return updated;
  }
}
