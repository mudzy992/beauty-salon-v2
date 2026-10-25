import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toDateOnlyString } from '../common/utils/date-only';
import { NotificationsService } from '../notifications/notifications.service';
import { resolvePushContext } from '../notifications/utils/load-reservation-push-context';
import { buildConfirmedCopy } from '../notifications/utils/reservation-push-copy';
import { EventsGateway } from '../events/events.gateway';
import { ReservationSharedService } from './reservation-shared.service';
import { ReservationQueriesService } from './reservation-queries.service';
import { RESERVATION_STATUS } from './constants';
import { SOCKET_EVENTS } from '../events/socket-events';
import { isActiveLock } from './utils/slot-hold.utils';
import { assertStylistSlotCapacity } from './utils/assert-stylist-slot-capacity';
import {
  acquireReservationDayLock,
  reservationDayKey,
} from './utils/booking-advisory-lock';

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
    if (!stylist || stylist.userId !== userId) {
      throw new ForbiddenException(
        'Možete raditi samo na vlastitom profilu stilista.',
      );
    }

    const snapshot = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { reservationDate: true },
    });
    if (!snapshot) throw new NotFoundException('Rezervacija nije pronađena.');

    await this.prisma.$transaction(async (tx) => {
      await acquireReservationDayLock(tx, snapshot.reservationDate);
      const res = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: {
          stylistResponses: true,
          items: { select: { serviceId: true } },
        },
      });
      if (!res) throw new NotFoundException('Rezervacija nije pronađena.');
      if (
        res.reservationDate.getTime() !== snapshot.reservationDate.getTime()
      ) {
        throw new ConflictException(
          'Termin je istovremeno pomjeren. Osvježite rezervaciju i pokušajte ponovo.',
        );
      }
      if (
        res.status !== RESERVATION_STATUS.PENDING &&
        res.status !== RESERVATION_STATUS.STYLIST_REVIEW
      ) {
        throw new BadRequestException(
          'Rezervacija više nije u fazi odgovora stilista.',
        );
      }

      const response = res.stylistResponses.find(
        (row) => row.stylistProfileId === stylistProfileId,
      );
      if (!response) {
        throw new NotFoundException('Odgovor za ovog stilista nije pronađen.');
      }
      const now = new Date();
      const otherLock = res.stylistResponses.find(
        (row) =>
          row.stylistProfileId !== stylistProfileId && isActiveLock(row, now),
      );
      if (otherLock) {
        throw new BadRequestException(
          'Drugi stilist trenutno razmatra ovu rezervaciju.',
        );
      }

      const ownActive = isActiveLock(response, now);
      const canAcceptWithoutLock =
        !ownActive &&
        response.hasLockedOnce &&
        (response.status === 'PENDING' || response.status === 'LOCKED');
      if (!ownActive && !canAcceptWithoutLock) {
        throw new BadRequestException('Prvo zaključajte rezervaciju (lock).');
      }

      const serviceIds =
        res.items.length > 0
          ? res.items.map((item) => item.serviceId)
          : [res.serviceId];
      await assertStylistSlotCapacity({
        db: tx,
        serviceIds,
        date: reservationDayKey(res.reservationDate),
        startTime: res.startTime,
        endTime: res.endTime,
        stylistProfileId,
        excludeReservationId: res.id,
      });

      const responseUpdate = await tx.reservationStylistResponse.updateMany({
        where: {
          reservationId,
          stylistProfileId,
          status: response.status,
          hasLockedOnce: response.hasLockedOnce,
          lockExpiresAt: response.lockExpiresAt,
        },
        data: { status: 'ACCEPTED', respondedAt: now },
      });
      if (responseUpdate.count !== 1) {
        throw new ConflictException(
          'Odgovor stilista je istovremeno promijenjen. Osvježite rezervaciju.',
        );
      }

      const reservationUpdate = await tx.reservation.updateMany({
        where: {
          id: reservationId,
          status: res.status,
          reservationDate: res.reservationDate,
          confirmedStylistId: null,
        },
        data: {
          status: this.shared.transitionTo(
            res.status,
            RESERVATION_STATUS.CONFIRMED,
          ),
          confirmedStylistId: stylistProfileId,
        },
      });
      if (reservationUpdate.count !== 1) {
        throw new ConflictException(
          'Rezervacija je istovremeno promijenjena. Osvježite rezervaciju.',
        );
      }

      await tx.reservationStylistResponse.updateMany({
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
      });
    });

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
      const ctx = await resolvePushContext(this.prisma, reservationId);
      const copy = buildConfirmedCopy(ctx);
      await this.notifications.send({
        userId: resWithClient.clientId,
        title: copy.title,
        body: copy.body,
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
    this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_CONFIRMED, accepted);
    if (resWithClient?.clientId) {
      this.events.emitToUser(
        resWithClient.clientId,
        SOCKET_EVENTS.RESERVATION_CONFIRMED,
        accepted,
      );
    }
    this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
      serviceId: accepted.serviceId,
      date: toDateOnlyString(accepted.reservationDate),
    });
    return accepted;
  }
}
