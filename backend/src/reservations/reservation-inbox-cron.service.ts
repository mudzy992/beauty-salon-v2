import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { ReservationDateService } from './reservation-date.service';
import { ReservationSharedService } from './reservation-shared.service';
import {
  RESERVATION_STATUS,
  SLOT_HOLD_INBOX_STATUSES,
  STYLIST_RESPONSE_STATUS,
} from './constants';
import { SOCKET_EVENTS } from '../events/socket-events';
import { isActiveLock } from './utils/slot-hold.utils';

@Injectable()
export class ReservationInboxCronService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dates: ReservationDateService,
    private readonly shared: ReservationSharedService,
    private readonly notifications: NotificationsService,
    private readonly events: EventsGateway,
  ) {}

  async processExpiredLocks() {
    const now = new Date();
    const locked = await this.prisma.reservationStylistResponse.findMany({
      where: {
        status: STYLIST_RESPONSE_STATUS.LOCKED,
        lockExpiresAt: { lte: now },
      },
      select: {
        id: true,
        reservationId: true,
        reservation: { select: { status: true, serviceId: true, reservationDate: true, clientId: true } },
      },
    });
    for (const row of locked) {
      await this.prisma.reservationStylistResponse.update({
        where: { id: row.id },
        data: {
          status: STYLIST_RESPONSE_STATUS.PENDING,
          lockExpiresAt: null,
        },
      });
      if (row.reservation.status === RESERVATION_STATUS.STYLIST_REVIEW) {
        await this.prisma.reservation.update({
          where: { id: row.reservationId },
          data: {
            status: this.shared.transitionTo(
              row.reservation.status,
              RESERVATION_STATUS.PENDING,
            ),
          },
        });
      }
      this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
        serviceId: row.reservation.serviceId,
        date: row.reservation.reservationDate,
      });
    }
    return { releasedCount: locked.length };
  }

  async processInboxTimeouts() {
    const hours = await this.dates.getInboxTimeoutHours();
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const stale = await this.prisma.reservation.findMany({
      where: {
        status: { in: [...SLOT_HOLD_INBOX_STATUSES] as any },
        createdAt: { lte: cutoff },
      },
      select: {
        id: true,
        status: true,
        clientId: true,
        serviceId: true,
        reservationDate: true,
        publicReferenceCode: true,
        clientViewToken: true,
        stylistResponses: {
          select: { status: true, lockExpiresAt: true },
        },
      },
    });
    const now = new Date();
    let cancelledCount = 0;
    for (const r of stale) {
      const hasLock = r.stylistResponses.some((x) => isActiveLock(x, now));
      if (hasLock) continue;
      await this.prisma.reservation.update({
        where: { id: r.id },
        data: {
          status: this.shared.transitionTo(
            r.status,
            RESERVATION_STATUS.CANCELLED_BY_STYLISTS,
          ),
          cancelledAt: now,
          cancelReason: 'Nijedan stilist nije preuzeo rezervaciju u predviđenom roku.',
        },
      });
      cancelledCount += 1;
      await this.notifications.send({
        userId: r.clientId,
        title: 'Rezervacija nije potvrđena',
        body: 'Termin nije preuzet na vrijeme. Možete ponovo zakazati.',
        type: 'reservation_cancelled',
        data: {
          reservationId: r.id,
          kind: 'reservation_cancelled',
          publicReferenceCode: r.publicReferenceCode,
          clientViewToken: r.clientViewToken,
        },
      });
      this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
        serviceId: r.serviceId,
        date: r.reservationDate,
      });
    }
    return { cancelledCount };
  }
}
