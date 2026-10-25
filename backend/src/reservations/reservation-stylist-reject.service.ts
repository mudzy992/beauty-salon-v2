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
import { buildCancelledCopy } from '../notifications/utils/reservation-push-copy';
import { EventsGateway } from '../events/events.gateway';
import { ReservationSharedService } from './reservation-shared.service';
import { ReservationQueriesService } from './reservation-queries.service';
import { RESERVATION_STATUS } from './constants';
import { SOCKET_EVENTS } from '../events/socket-events';
import { isActiveLock } from './utils/slot-hold.utils';
import { acquireReservationDayLock } from './utils/booking-advisory-lock';

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

    const rejection = await this.prisma.$transaction(async (tx) => {
      await acquireReservationDayLock(tx, snapshot.reservationDate);
      const res = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: { stylistResponses: true },
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
      if (response.status !== 'LOCKED' && response.status !== 'PENDING') {
        throw new BadRequestException('Već ste odgovorili.');
      }

      const responseUpdate = await tx.reservationStylistResponse.updateMany({
        where: {
          reservationId,
          stylistProfileId,
          status: response.status,
          lockExpiresAt: response.lockExpiresAt,
        },
        data: {
          status: 'REJECTED',
          rejectionReason: dto?.rejectionReason,
          respondedAt: new Date(),
        },
      });
      if (responseUpdate.count !== 1) {
        throw new ConflictException(
          'Odgovor stilista je istovremeno promijenjen. Osvježite i pokušajte ponovo.',
        );
      }

      const now = new Date();
      const otherResponses = res.stylistResponses.filter(
        (row) => row.stylistProfileId !== stylistProfileId,
      );
      const stillPendingOrLocked = otherResponses.some(
        (row) => row.status === 'PENDING' || isActiveLock(row, now),
      );
      let cancelled = false;
      if (!stillPendingOrLocked) {
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
              RESERVATION_STATUS.CANCELLED_BY_STYLISTS,
            ),
            cancelledAt: now,
            cancelReason: 'Svi stilisti su odbili rezervaciju.',
          },
        });
        if (reservationUpdate.count !== 1) {
          throw new ConflictException(
            'Rezervacija je istovremeno promijenjena. Osvježite i pokušajte ponovo.',
          );
        }
        cancelled = true;
      }
      return {
        cancelled,
        clientId: res.clientId,
        serviceId: res.serviceId,
        date: toDateOnlyString(res.reservationDate),
      };
    });

    if (rejection.cancelled && rejection.clientId) {
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
          reason: 'Nijedan stilist nije mogao prihvatiti termin.',
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
    this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
      serviceId: rejection.serviceId,
      date: rejection.date,
    });
    return result;
  }
}
