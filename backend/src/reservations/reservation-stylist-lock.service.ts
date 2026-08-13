import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { ReservationSharedService } from './reservation-shared.service';
import { ReservationQueriesService } from './reservation-queries.service';
import { RESERVATION_STATUS, STYLIST_RESPONSE_STATUS } from './constants';
import { SOCKET_EVENTS } from '../events/socket-events';
import { isActiveLock } from './utils/slot-hold.utils';

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
    const lockMinutes = salon.reservationLockMinutes;
    const res = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { stylistResponses: true },
    });
    if (!res) throw new NotFoundException('Rezervacija nije pronađena.');
    if (
      res.status !== RESERVATION_STATUS.PENDING &&
      res.status !== RESERVATION_STATUS.STYLIST_REVIEW
    ) {
      throw new BadRequestException(
        'Rezervacija nije u fazi odgovora stilista.',
      );
    }
    const stylist = await this.prisma.stylistProfile.findUnique({
      where: { id: stylistProfileId },
      select: { userId: true },
    });
    if (!stylist || stylist.userId !== userId)
      throw new ForbiddenException(
        'Možete raditi samo na vlastitom profilu stilista.',
      );
    const response = res.stylistResponses.find(
      (r) => r.stylistProfileId === stylistProfileId,
    );
    if (!response)
      throw new NotFoundException(
        'Odgovor za ovog stilista nije pronađen.',
      );
    if (response.status === 'ACCEPTED' || response.status === 'REJECTED')
      throw new BadRequestException(
        'Već ste odgovorili na ovu rezervaciju.',
      );
    const now = new Date();
    if (isActiveLock(response, now)) {
      return this.queries.findOne(reservationId, {
        sub: userId,
        roles: ['STYLIST'],
        username: '',
        email: '',
      });
    }
    if (response.hasLockedOnce) {
      throw new BadRequestException(
        'Već ste jednom zaključali ovu rezervaciju. Možete je prihvatiti ili odbiti.',
      );
    }
    const otherLock = res.stylistResponses.find(
      (r) =>
        r.stylistProfileId !== stylistProfileId && isActiveLock(r, now),
    );
    if (otherLock) {
      throw new BadRequestException(
        'Drugi stilist trenutno razmatra ovu rezervaciju. Pričekajte da je oslobodi.',
      );
    }
    const lockExpiresAt = new Date(now.getTime() + lockMinutes * 60 * 1000);
    const nextStatus = this.shared.transitionTo(
      res.status,
      RESERVATION_STATUS.STYLIST_REVIEW,
    );
    await this.prisma.$transaction([
      this.prisma.reservationStylistResponse.update({
        where: {
          reservationId_stylistProfileId: {
            reservationId,
            stylistProfileId,
          },
        },
        data: {
          status: STYLIST_RESPONSE_STATUS.LOCKED,
          lockedAt: now,
          lockExpiresAt,
          hasLockedOnce: true,
        },
      }),
      this.prisma.reservation.update({
        where: { id: reservationId },
        data: { status: nextStatus },
      }),
    ]);
    const locked = await this.queries.findOne(reservationId, {
      sub: userId,
      roles: ['STYLIST'],
      username: '',
      email: '',
    });
    this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_STYLIST_RESPONSE, locked);
    this.events.emitToUser(res.clientId, SOCKET_EVENTS.RESERVATION_UPDATED, locked);
    this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
      serviceId: res.serviceId,
      date: res.reservationDate,
    });
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
    if (!isActiveLock(response)) {
      throw new BadRequestException('Nemate aktivni lock na ovoj rezervaciji.');
    }
    const nextStatus =
      res.status === RESERVATION_STATUS.STYLIST_REVIEW
        ? this.shared.transitionTo(res.status, RESERVATION_STATUS.PENDING)
        : res.status;
    await this.prisma.$transaction([
      this.prisma.reservationStylistResponse.update({
        where: {
          reservationId_stylistProfileId: {
            reservationId,
            stylistProfileId,
          },
        },
        data: {
          status: STYLIST_RESPONSE_STATUS.PENDING,
          lockExpiresAt: null,
        },
      }),
      this.prisma.reservation.update({
        where: { id: reservationId },
        data: { status: nextStatus },
      }),
    ]);
    const unlocked = await this.queries.findOne(reservationId, {
      sub: userId,
      roles: ['STYLIST'],
      username: '',
      email: '',
    });
    this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_STYLIST_RESPONSE, unlocked);
    this.events.emitToUser(res.clientId, SOCKET_EVENTS.RESERVATION_UPDATED, unlocked);
    this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
      serviceId: res.serviceId,
      date: res.reservationDate,
    });
    return unlocked;
  }
}
