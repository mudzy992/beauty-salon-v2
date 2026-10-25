import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { resolvePushContext } from '../notifications/utils/load-reservation-push-context';
import { buildCancelledCopy } from '../notifications/utils/reservation-push-copy';
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
        reservation: {
          select: {
            status: true,
            serviceId: true,
            reservationDate: true,
            clientId: true,
          },
        },
      },
    });
    let releasedCount = 0;
    for (const row of locked) {
      const released = await this.prisma.reservationStylistResponse.updateMany({
        where: {
          id: row.id,
          status: STYLIST_RESPONSE_STATUS.LOCKED,
          lockExpiresAt: { lte: now },
        },
        data: {
          status: STYLIST_RESPONSE_STATUS.PENDING,
          lockExpiresAt: null,
        },
      });
      if (released.count !== 1) continue;
      releasedCount += 1;
      if (row.reservation.status === RESERVATION_STATUS.STYLIST_REVIEW) {
        await this.prisma.reservation.updateMany({
          where: {
            id: row.reservationId,
            status: RESERVATION_STATUS.STYLIST_REVIEW,
          },
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
    return { releasedCount };
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
      const cancelled = await this.prisma.reservation.updateMany({
        where: {
          id: r.id,
          status: r.status,
          createdAt: { lte: cutoff },
          stylistResponses: {
            none: {
              status: STYLIST_RESPONSE_STATUS.LOCKED,
              OR: [{ lockExpiresAt: null }, { lockExpiresAt: { gt: now } }],
            },
          },
        },
        data: {
          status: this.shared.transitionTo(
            r.status,
            RESERVATION_STATUS.CANCELLED_BY_STYLISTS,
          ),
          cancelledAt: now,
          cancelReason:
            'Nijedan stilist nije preuzeo rezervaciju u predviđenom roku.',
        },
      });
      if (cancelled.count !== 1) continue;
      cancelledCount += 1;
      const ctx = await resolvePushContext(
        this.prisma,
        r.id,
        r.publicReferenceCode,
      );
      const copy = buildCancelledCopy({
        ctx,
        title: 'Rezervacija nije potvrđena',
        reason: 'Termin nije preuzet na vrijeme. Možete ponovo zakazati.',
      });
      await this.notifications.send({
        userId: r.clientId,
        title: copy.title,
        body: copy.body,
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
