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
import {
  RESERVATION_STATUS,
  SLOT_OCCUPYING_STATUSES,
} from './constants';
import { SOCKET_EVENTS } from '../events/socket-events';
import { intervalsOverlap, timeToMinutes } from './utils/time-slot.utils';

@Injectable()
export class ReservationStylistAcceptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly events: EventsGateway,
    private readonly shared: ReservationSharedService,
    private readonly queries: ReservationQueriesService,
  ) {}

  async stylistAccept(
    reservationId: string,
    stylistProfileId: string,
    userId: string,
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
    if (response.status !== 'LOCKED')
      throw new BadRequestException(
        'Prvo zaključajte rezervaciju (lock).',
      );
    if (response.lockExpiresAt && new Date() > response.lockExpiresAt)
      throw new BadRequestException(
        'Lock je istekao. Zaključajte ponovo.',
      );
    const dayStart = new Date(res.reservationDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(res.reservationDate);
    dayEnd.setHours(23, 59, 59, 999);
    const sameDay = await this.prisma.reservation.findMany({
      where: {
        id: { not: reservationId },
        confirmedStylistId: stylistProfileId,
        reservationDate: { gte: dayStart, lte: dayEnd },
        status: { in: [...SLOT_OCCUPYING_STATUSES] as any },
      },
      select: { id: true, startTime: true, endTime: true },
    });
    const acceptStart = timeToMinutes(res.startTime);
    const acceptEnd = timeToMinutes(res.endTime);
    const hasOverlap = sameDay.some((other) =>
      intervalsOverlap(
        acceptStart,
        acceptEnd,
        timeToMinutes(other.startTime),
        timeToMinutes(other.endTime),
      ),
    );
    if (hasOverlap) {
      throw new BadRequestException(
        'Imate već potvrđen termin koji se preklapa s ovim vremenom.',
      );
    }
    await this.prisma.$transaction([
      this.prisma.reservation.update({
        where: { id: reservationId },
        data: {
          status: this.shared.transitionTo(
            res.status,
            RESERVATION_STATUS.CONFIRMED,
          ),
          confirmedStylistId: stylistProfileId,
        },
      }),
      this.prisma.reservationStylistResponse.update({
        where: {
          reservationId_stylistProfileId: {
            reservationId,
            stylistProfileId,
          },
        },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      }),
      this.prisma.reservationStylistResponse.updateMany({
        where: {
          reservationId,
          stylistProfileId: { not: stylistProfileId },
          status: 'LOCKED',
        },
        data: {
          status: 'PENDING',
          lockedAt: null,
          lockExpiresAt: null,
        },
      }),
    ]);
    const resWithClient = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        clientId: true,
        service: { select: { name: true } },
        reservationDate: true,
        startTime: true,
        publicReferenceCode: true,
        clientViewToken: true,
      },
    });
    if (resWithClient?.clientId) {
      await this.notifications.send({
        userId: resWithClient.clientId,
        title: 'Rezervacija potvrđena',
        body: `Vaša rezervacija za ${resWithClient.service.name} je potvrđena.`,
        type: 'reservation_confirmed',
        data: {
          reservationId,
          kind: 'reservation_confirmed',
          publicReferenceCode: resWithClient.publicReferenceCode,
          clientViewToken: resWithClient.clientViewToken,
        },
      });
    }
    const accepted = await this.queries.findOne(reservationId, {
      sub: userId,
      roles: ['STYLIST'],
      username: '',
      email: '',
    });
    this.events.emitToAdmins(
      SOCKET_EVENTS.RESERVATION_CONFIRMED,
      accepted,
    );
    if (resWithClient?.clientId) {
      this.events.emitToUser(
        resWithClient.clientId,
        SOCKET_EVENTS.RESERVATION_CONFIRMED,
        accepted,
      );
    }
    this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
      serviceId: accepted.serviceId,
      date: accepted.reservationDate,
    });
    return accepted;
  }
}
