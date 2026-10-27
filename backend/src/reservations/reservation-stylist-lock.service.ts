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
import { ReservationQueriesService } from './reservation-queries.service';
import { RESERVATION_STATUS, STYLIST_RESPONSE_STATUS } from './constants';
import { SOCKET_EVENTS } from '../events/socket-events';
import { isActiveLock } from './utils/slot-hold.utils';
import { assertStylistSlotCapacity } from './utils/assert-stylist-slot-capacity';
import {
  acquireReservationDayLock,
  reservationDayKey,
} from './utils/booking-advisory-lock';

@Injectable()
export class ReservationStylistLockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
    private readonly shared: ReservationSharedService,
    private readonly queries: ReservationQueriesService,
  ) {}

  async stylistLock(
    reservationId: string,
    stylistProfileId: string,
    userId: string,
  ) {
    const salon = await this.prisma.salonSettings.findFirst();
    if (!salon) throw new NotFoundException('Salon nije konfigurisan.');
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

    const didLock = await this.prisma.$transaction(async (tx) => {
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
          'Rezervacija nije u fazi odgovora stilista.',
        );
      }
      const response = res.stylistResponses.find(
        (row) => row.stylistProfileId === stylistProfileId,
      );
      if (!response) {
        throw new NotFoundException('Odgovor za ovog stilista nije pronađen.');
      }
      if (
        response.status === STYLIST_RESPONSE_STATUS.ACCEPTED ||
        response.status === STYLIST_RESPONSE_STATUS.REJECTED
      ) {
        throw new BadRequestException('Već ste odgovorili na ovu rezervaciju.');
      }
      const now = new Date();
      if (isActiveLock(response, now)) return false;
      if (response.hasLockedOnce) {
        throw new BadRequestException(
          'Već ste jednom zaključali ovu rezervaciju. Možete je prihvatiti ili odbiti.',
        );
      }
      const otherLock = res.stylistResponses.find(
        (row) =>
          row.stylistProfileId !== stylistProfileId && isActiveLock(row, now),
      );
      if (otherLock) {
        throw new BadRequestException(
          'Drugi stilist trenutno razmatra ovu rezervaciju. Pričekajte da je oslobodi.',
        );
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

      const lockExpiresAt = new Date(
        now.getTime() + salon.reservationLockMinutes * 60 * 1000,
      );
      const responseUpdate = await tx.reservationStylistResponse.updateMany({
        where: {
          reservationId,
          stylistProfileId,
          status: response.status,
          hasLockedOnce: false,
          lockExpiresAt: response.lockExpiresAt,
        },
        data: {
          status: STYLIST_RESPONSE_STATUS.LOCKED,
          lockedAt: now,
          lockExpiresAt,
          hasLockedOnce: true,
        },
      });
      if (responseUpdate.count !== 1) {
        throw new ConflictException(
          'Rezervacija je istovremeno zaključana ili odgovor promijenjen. Osvježite i pokušajte ponovo.',
        );
      }

      const nextStatus = this.shared.transitionTo(
        res.status,
        RESERVATION_STATUS.STYLIST_REVIEW,
      );
      const reservationUpdate = await tx.reservation.updateMany({
        where: {
          id: reservationId,
          status: res.status,
          reservationDate: res.reservationDate,
        },
        data: { status: nextStatus },
      });
      if (reservationUpdate.count !== 1) {
        throw new ConflictException(
          'Rezervacija je istovremeno promijenjena. Osvježite i pokušajte ponovo.',
        );
      }
      return true;
    });

    const locked = await this.queries.findOne(reservationId, {
      sub: userId,
      roles: ['STYLIST'],
      username: '',
      email: '',
    });
    if (didLock) {
      this.events.emitToAdmins(
        SOCKET_EVENTS.RESERVATION_STYLIST_RESPONSE,
        locked,
      );
      this.events.emitToUser(
        locked.clientId,
        SOCKET_EVENTS.RESERVATION_UPDATED,
        locked,
      );
      this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
        serviceId: locked.serviceId,
        date: toDateOnlyString(locked.reservationDate),
      });
    }
    return locked;
  }

  async stylistUnlock(
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

    const clientId = await this.prisma.$transaction(async (tx) => {
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
      const response = res.stylistResponses.find(
        (row) => row.stylistProfileId === stylistProfileId,
      );
      if (!response) {
        throw new NotFoundException('Odgovor za ovog stilista nije pronađen.');
      }
      if (!isActiveLock(response)) {
        throw new BadRequestException(
          'Nemate aktivni lock na ovoj rezervaciji.',
        );
      }

      const responseUpdate = await tx.reservationStylistResponse.updateMany({
        where: {
          reservationId,
          stylistProfileId,
          status: STYLIST_RESPONSE_STATUS.LOCKED,
          lockExpiresAt: response.lockExpiresAt,
        },
        data: {
          status: STYLIST_RESPONSE_STATUS.PENDING,
          lockExpiresAt: null,
        },
      });
      if (responseUpdate.count !== 1) {
        throw new ConflictException(
          'Lock je istovremeno promijenjen. Osvježite rezervaciju i pokušajte ponovo.',
        );
      }

      if (res.status === RESERVATION_STATUS.STYLIST_REVIEW) {
        const reservationUpdate = await tx.reservation.updateMany({
          where: {
            id: reservationId,
            status: RESERVATION_STATUS.STYLIST_REVIEW,
            reservationDate: res.reservationDate,
          },
          data: {
            status: this.shared.transitionTo(
              res.status,
              RESERVATION_STATUS.PENDING,
            ),
          },
        });
        if (reservationUpdate.count !== 1) {
          throw new ConflictException(
            'Rezervacija je istovremeno promijenjena. Osvježite i pokušajte ponovo.',
          );
        }
      }
      return res.clientId;
    });

    const unlocked = await this.queries.findOne(reservationId, {
      sub: userId,
      roles: ['STYLIST'],
      username: '',
      email: '',
    });
    this.events.emitToAdmins(
      SOCKET_EVENTS.RESERVATION_STYLIST_RESPONSE,
      unlocked,
    );
    this.events.emitToUser(
      clientId,
      SOCKET_EVENTS.RESERVATION_UPDATED,
      unlocked,
    );
    this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
      serviceId: unlocked.serviceId,
      date: toDateOnlyString(unlocked.reservationDate),
    });
    return unlocked;
  }
}
