import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../events/events.gateway';
import { ReservationSharedService } from './reservation-shared.service';
import { ReservationQueriesService } from './reservation-queries.service';
import { RESERVATION_STATUS } from './constants';
import { SOCKET_EVENTS } from '../events/socket-events';

@Injectable()
export class ReservationStylistRejectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly events: EventsGateway,
    private readonly shared: ReservationSharedService,
    private readonly queries: ReservationQueriesService,
  ) {}

  async stylistReject(
    reservationId: string,
    stylistProfileId: string,
    userId: string,
    dto?: { rejectionReason?: string },
  ) {
    const stylist = await this.prisma.stylistProfile.findUnique({
      where: { id: stylistProfileId },
      select: { userId: true },
    });
    if (!stylist || stylist.userId !== userId)
      throw new ForbiddenException(
        'Možete raditi samo na vlastitom profilu stilista.',
      );
    const res = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { stylistResponses: true },
    });
    if (!res) throw new NotFoundException('Rezervacija nije pronađena.');
    const response = res.stylistResponses.find(
      (r) => r.stylistProfileId === stylistProfileId,
    );
    if (!response)
      throw new NotFoundException(
        'Odgovor za ovog stilista nije pronađen.',
      );
    if (response.status !== 'LOCKED' && response.status !== 'PENDING')
      throw new BadRequestException('Već ste odgovorili.');
    await this.prisma.reservationStylistResponse.update({
      where: {
        reservationId_stylistProfileId: {
          reservationId,
          stylistProfileId,
        },
      },
      data: {
        status: 'REJECTED',
        rejectionReason: dto?.rejectionReason,
        respondedAt: new Date(),
      },
    });
    const stillPendingOrLocked = res.stylistResponses.filter(
      (r) =>
        r.stylistProfileId !== stylistProfileId &&
        (r.status === 'PENDING' ||
          (r.status === 'LOCKED' &&
            r.lockExpiresAt &&
            new Date() < r.lockExpiresAt)),
    );
    if (stillPendingOrLocked.length === 0) {
      await this.prisma.reservation.update({
        where: { id: reservationId },
        data: {
          status: this.shared.transitionTo(
            res.status,
            RESERVATION_STATUS.CANCELLED_BY_STYLISTS,
          ),
          cancelledAt: new Date(),
          cancelReason: 'Svi stilisti su odbili rezervaciju.',
        },
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
        await this.notifications.send({
          userId: resWithClient.clientId,
          title: 'Rezervacija otkazana',
          body: 'Rezervacija je otkazana jer nijedan stilist nije mogao prihvatiti termin.',
          type: 'reservation_cancelled',
          data: {
            reservationId,
            kind: 'reservation_cancelled',
            publicReferenceCode: resWithClient.publicReferenceCode,
            clientViewToken: resWithClient.clientViewToken,
          },
        });
      }
    }
    const result = await this.queries.findOne(reservationId, {
      sub: userId,
      roles: ['STYLIST'],
      username: '',
      email: '',
    });
    this.events.emitToAdmins(
      SOCKET_EVENTS.RESERVATION_STYLIST_RESPONSE,
      result,
    );
    if (stillPendingOrLocked.length === 0) {
      this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
        serviceId: res.serviceId,
        date: res.reservationDate,
      });
    }
    return result;
  }
}
