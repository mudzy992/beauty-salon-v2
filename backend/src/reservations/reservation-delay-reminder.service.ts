import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { resolvePushContext } from '../notifications/utils/load-reservation-push-context';
import { buildDelayWarningCopy } from '../notifications/utils/reservation-push-copy';
import { RESERVATION_STATUS } from './constants';
import { timeToMinutes } from './utils/time-slot.utils';
import { ReservationDateService } from './reservation-date.service';
import { getDateOnlyDayBounds } from '../common/utils/date-only';

const EVENT_TYPE = 'reservation.delay_warning';

type DelayWarningPayload = {
  sourceReservationId: string;
  reservationId: string;
  clientId: string;
  title: string;
  body: string;
};

@Injectable()
export class ReservationDelayReminderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly dates: ReservationDateService,
  ) {}

  async processReservationDelayReminders(): Promise<{ queuedCount: number }> {
    const salon = await this.prisma.salonSettings.findFirst();
    if (!salon) return { queuedCount: 0 };
    const pause = salon.pauseBetweenServices ?? 0;
    const threshold = Math.floor(pause / 2);
    if (threshold <= 0) return { queuedCount: 0 };

    const now = new Date();
    const { gte: todayStart, lt: tomorrowStart } = getDateOnlyDayBounds(
      this.dates.toSalonDateOnlyString(now),
    );
    const nowMinutes = timeToMinutes(this.dates.toSalonTimeString(now));
    const running = await this.prisma.reservation.findMany({
      where: {
        status: RESERVATION_STATUS.IN_PROGRESS,
        reservationDate: { gte: todayStart, lt: tomorrowStart },
        delayNotifiedAt: null,
        confirmedStylistId: { not: null },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        confirmedStylistId: true,
        useBreakAfterOverrun: true,
      },
    });

    let queuedCount = 0;
    for (const reservation of running) {
      const endMinutes = timeToMinutes(reservation.endTime);
      if (nowMinutes - endMinutes < threshold) continue;

      if (reservation.useBreakAfterOverrun === true) {
        await this.claimAndQueue(reservation.id, []);
        continue;
      }

      const future = await this.prisma.reservation.findMany({
        where: {
          confirmedStylistId: reservation.confirmedStylistId!,
          reservationDate: { gte: todayStart, lt: tomorrowStart },
          startTime: { gt: reservation.startTime },
          status: {
            in: [
              RESERVATION_STATUS.CONFIRMED,
              RESERVATION_STATUS.ATTENDANCE_CONFIRMED,
            ] as never,
          },
        },
        select: { id: true, clientId: true, startTime: true },
        orderBy: { startTime: 'asc' },
      });

      // The first next client is handled by the reschedule/reorder flow.
      const targets = future.slice(1);
      const events: Prisma.OutboxEventCreateManyInput[] = [];
      for (const target of targets) {
        const context = await resolvePushContext(this.prisma, target.id);
        const copy = buildDelayWarningCopy(context);
        const payload: DelayWarningPayload = {
          sourceReservationId: reservation.id,
          reservationId: target.id,
          clientId: target.clientId,
          title: copy.title,
          body: copy.body,
        };
        events.push({
          eventType: EVENT_TYPE,
          aggregateId: reservation.id,
          dedupeKey: `reservation:${reservation.id}:delay-warning:${target.id}`,
          payload: payload as unknown as Prisma.InputJsonValue,
        });
      }
      queuedCount += await this.claimAndQueue(reservation.id, events);
    }
    return { queuedCount };
  }

  async deliverOutboxEvent(eventId: string, rawPayload: unknown): Promise<void> {
    const payload = this.parsePayload(rawPayload);
    await this.notifications.send({
      userId: payload.clientId,
      title: payload.title,
      body: payload.body,
      type: 'reservation_reminder',
      data: {
        kind: 'delay_warning',
        reservationId: payload.reservationId,
      },
      channel: 'PUSH',
      sourceEventId: eventId,
    });
  }

  private async claimAndQueue(
    reservationId: string,
    events: Prisma.OutboxEventCreateManyInput[],
  ): Promise<number> {
    const claimedAt = new Date();
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.reservation.updateMany({
        where: {
          id: reservationId,
          status: RESERVATION_STATUS.IN_PROGRESS,
          delayNotifiedAt: null,
        },
        data: { delayNotifiedAt: claimedAt },
      });
      if (claimed.count !== 1) return 0;
      if (events.length === 0) return 0;
      const inserted = await tx.outboxEvent.createMany({
        data: events,
        skipDuplicates: true,
      });
      return inserted.count;
    });
  }

  private parsePayload(rawPayload: unknown): DelayWarningPayload {
    if (
      !rawPayload ||
      typeof rawPayload !== 'object' ||
      !('sourceReservationId' in rawPayload) ||
      typeof rawPayload.sourceReservationId !== 'string' ||
      !('reservationId' in rawPayload) ||
      typeof rawPayload.reservationId !== 'string' ||
      !('clientId' in rawPayload) ||
      typeof rawPayload.clientId !== 'string' ||
      !('title' in rawPayload) ||
      typeof rawPayload.title !== 'string' ||
      !('body' in rawPayload) ||
      typeof rawPayload.body !== 'string'
    ) {
      throw new Error('Neispravan delay-warning outbox payload.');
    }
    return rawPayload as DelayWarningPayload;
  }
}
