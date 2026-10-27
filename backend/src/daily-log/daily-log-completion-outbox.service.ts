import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { SOCKET_EVENTS } from '../events/socket-events';
import { DailyLogReceiptService } from './daily-log-receipt.service';
import { DEFAULT_SALON_TIMEZONE } from '../common/utils/zoned-time';
import { toDateOnlyString } from '../common/utils/date-only';

type DailyLogCompletedPayload = {
  dailyLogEntryId: string;
  completionVersion: number;
};

const BATCH_SIZE = 25;
const DELIVERY_LEASE_MS = 5 * 60 * 1000;
const MAX_RETRY_DELAY_MS = 60 * 60 * 1000;

@Injectable()
export class DailyLogCompletionOutboxService {
  private readonly logger = new Logger(DailyLogCompletionOutboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly receipt: DailyLogReceiptService,
    private readonly events: EventsGateway,
  ) {}

  /**
   * Attempts delivery only after the completion transaction has committed.
   * The outbox row and notification provenance are durable/idempotent; external
   * email, push and socket delivery are at-least-once across a process crash.
   */
  async dispatchAfterCommit(eventId: string): Promise<void> {
    let claimed = false;
    let attempts = 0;
    try {
      const now = new Date();
      const claim = await this.prisma.outboxEvent.updateMany({
        where: {
          id: eventId,
          eventType: 'daily_log.completed',
          status: 'PENDING',
          nextAttemptAt: { lte: now },
        },
        data: {
          status: 'PROCESSING',
          lockedAt: now,
          attempts: { increment: 1 },
        },
      });
      if (claim.count !== 1) return;
      claimed = true;

      const event = await this.prisma.outboxEvent.findUnique({
        where: { id: eventId },
      });
      if (!event || event.eventType !== 'daily_log.completed') {
        throw new Error('Događaj završetka dnevnika nije pronađen.');
      }
      attempts = event.attempts;
      const payload = this.parsePayload(event.payload);
      const entry = await this.prisma.dailyLogEntry.findUnique({
        where: { id: payload.dailyLogEntryId },
        select: {
          id: true,
          status: true,
          completionVersion: true,
          deletedAt: true,
          clientId: true,
          reservationId: true,
          reservation: {
            select: {
              id: true,
              clientId: true,
              serviceId: true,
              reservationDate: true,
              status: true,
            },
          },
        },
      });

      // A revert or a newer completion may supersede a queued event. Do not
      // send a stale receipt or realtime invalidation for that old generation.
      if (
        !entry ||
        entry.deletedAt ||
        entry.status !== 'COMPLETED' ||
        entry.completionVersion !== payload.completionVersion
      ) {
        await this.markDelivered(eventId);
        return;
      }

      await this.receipt.sendPaymentReceiptIfApplicable(
        payload.dailyLogEntryId,
        eventId,
        payload.completionVersion,
      );
      this.events.emitToAdmins(SOCKET_EVENTS.DAILY_LOG_UPDATED, {
        dailyLogEntryId: entry.id,
        status: 'COMPLETED',
      });
      this.events.emitToStylists(SOCKET_EVENTS.DAILY_LOG_UPDATED, {
        dailyLogEntryId: entry.id,
        status: 'COMPLETED',
      });

      if (entry.reservation && entry.reservation.status === 'COMPLETED') {
        const reservationUpdate = {
          id: entry.reservation.id,
          status: 'COMPLETED',
        };
        this.events.emitToAdmins(
          SOCKET_EVENTS.RESERVATION_UPDATED,
          reservationUpdate,
        );
        this.events.emitToStylists(
          SOCKET_EVENTS.RESERVATION_UPDATED,
          reservationUpdate,
        );
        this.events.emitToUser(
          entry.reservation.clientId,
          SOCKET_EVENTS.RESERVATION_UPDATED,
          reservationUpdate,
        );
        this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
          serviceId: entry.reservation.serviceId,
          date: toDateOnlyString(entry.reservation.reservationDate),
        });
      }

      await this.markDelivered(eventId);
    } catch (error) {
      const errorType = error instanceof Error ? error.name : 'Error';
      this.logger.warn(
        `Daily-log outbox ${eventId} delivery failed (${errorType}).`,
      );
      if (!claimed) return;

      const retryDelay = Math.min(
        MAX_RETRY_DELAY_MS,
        1000 * 2 ** Math.min(Math.max(attempts, 1), 12),
      );
      try {
        await this.prisma.outboxEvent.updateMany({
          where: { id: eventId, status: 'PROCESSING' },
          data: {
            status: 'PENDING',
            nextAttemptAt: new Date(Date.now() + retryDelay),
            lockedAt: null,
            lastError: `Delivery failed (${errorType}).`,
          },
        });
      } catch (updateError) {
        const updateType =
          updateError instanceof Error ? updateError.name : 'Error';
        this.logger.error(
          `Daily-log outbox ${eventId} could not be requeued (${updateType}).`,
        );
      }
    }
  }

  @Cron('*/1 * * * *', {
    timeZone: DEFAULT_SALON_TIMEZONE,
    waitForCompletion: true,
  })
  async retryPending(): Promise<void> {
    const now = new Date();
    try {
      await this.prisma.outboxEvent.updateMany({
        where: {
          eventType: 'daily_log.completed',
          status: 'PROCESSING',
          lockedAt: { lt: new Date(now.getTime() - DELIVERY_LEASE_MS) },
        },
        data: {
          status: 'PENDING',
          nextAttemptAt: now,
          lockedAt: null,
          lastError: 'Expired delivery lease recovered.',
        },
      });
      const pending = await this.prisma.outboxEvent.findMany({
        where: {
          eventType: 'daily_log.completed',
          status: 'PENDING',
          nextAttemptAt: { lte: now },
        },
        orderBy: [{ nextAttemptAt: 'asc' }, { createdAt: 'asc' }],
        take: BATCH_SIZE,
        select: { id: true },
      });
      for (const event of pending) {
        await this.dispatchAfterCommit(event.id);
      }
    } catch (error) {
      const errorType = error instanceof Error ? error.name : 'Error';
      this.logger.warn(`Daily-log outbox retry scan failed (${errorType}).`);
    }
  }

  private parsePayload(payload: unknown): DailyLogCompletedPayload {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload završetka dnevnika nije validan.');
    }
    const value = payload as Record<string, unknown>;
    if (
      typeof value.dailyLogEntryId !== 'string' ||
      typeof value.completionVersion !== 'number' ||
      !Number.isInteger(value.completionVersion) ||
      value.completionVersion < 1
    ) {
      throw new Error('Payload završetka dnevnika nije validan.');
    }
    return {
      dailyLogEntryId: value.dailyLogEntryId,
      completionVersion: value.completionVersion,
    };
  }

  private async markDelivered(eventId: string): Promise<void> {
    await this.prisma.outboxEvent.updateMany({
      where: { id: eventId, status: 'PROCESSING' },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        lockedAt: null,
        lastError: null,
      },
    });
  }
}
