import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../events/events.gateway';
import { SOCKET_EVENTS } from '../events/socket-events';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ReservationQueriesService } from './reservation-queries.service';
import { ReservationAppointmentReminderService } from './reservation-appointment-reminder.service';
import { ReservationDirectDailyLogCronService } from './reservation-direct-daily-log-cron.service';
import { DEFAULT_SALON_TIMEZONE } from '../common/utils/zoned-time';

const SUPPORTED_EVENT_TYPES = [
  'reservation.created',
  'reservation.appointment_reminder',
  'reservation.daily_log_pending_reminder',
] as const;
const BATCH_SIZE = 25;
const DELIVERY_LEASE_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const MAX_RETRY_DELAY_MS = 60 * 60 * 1000;
const DIAGNOSTICS_EVENT_LIMIT = 50;

type ReservationCreatedPayload = {
  reservationId: string;
  actor: CurrentUserPayload;
  notifyUserIds: string[];
  notificationTitle: string;
  notificationBody: string;
  serviceId: string;
  serviceIds: string[];
  reservationDate: string;
  emitToAdmins: boolean;
  emitToStylists: boolean;
};

@Injectable()
export class ReservationOutboxService {
  private readonly logger = new Logger(ReservationOutboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly events: EventsGateway,
    private readonly queries: ReservationQueriesService,
    @Optional()
    private readonly appointmentReminders?: ReservationAppointmentReminderService,
    @Optional()
    private readonly dailyLogReminders?: ReservationDirectDailyLogCronService,
  ) {}

  /**
   * Delivers one claimed, committed outbox event. External I/O is never run in
   * the producer transaction. Push/email remain at-least-once if a process
   * crashes after provider acceptance but before marking the event delivered.
   */
  async dispatchAfterCommit(eventId: string): Promise<void> {
    let claimed = false;
    let attempts = 0;
    try {
      const claim = await this.prisma.outboxEvent.updateMany({
        where: {
          id: eventId,
          status: 'PENDING',
          nextAttemptAt: { lte: new Date() },
        },
        data: {
          status: 'PROCESSING',
          lockedAt: new Date(),
          attempts: { increment: 1 },
        },
      });
      if (claim.count !== 1) return;
      claimed = true;
      attempts = 1;

      const event = await this.prisma.outboxEvent.findUnique({
        where: { id: eventId },
      });
      if (!event) return;
      attempts = event.attempts;
      if (event.eventType === 'reservation.created') {
        const payload = event.payload as unknown as ReservationCreatedPayload;
        const reservation = await this.queries.findOne(
          payload.reservationId,
          payload.actor,
        );

        if (payload.notifyUserIds.length > 0) {
          await this.notifications.sendToMany(
            payload.notifyUserIds,
            payload.notificationTitle,
            payload.notificationBody,
            'reservation_new',
            {
              reservationId: payload.reservationId,
              kind: 'reservation_new',
            },
            event.id,
          );
        }

        if (payload.emitToAdmins) {
          this.events.emitToAdmins(
            SOCKET_EVENTS.RESERVATION_CREATED,
            reservation,
          );
        }
        if (payload.emitToStylists) {
          this.events.emitToStylists(
            SOCKET_EVENTS.RESERVATION_CREATED,
            reservation,
          );
        }
        this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
          serviceId: payload.serviceId,
          serviceIds: payload.serviceIds,
          date: payload.reservationDate,
        });
      } else if (event.eventType === 'reservation.appointment_reminder') {
        if (!this.appointmentReminders) {
          throw new Error('Appointment reminder outbox handler nije dostupan.');
        }
        await this.appointmentReminders.deliverOutboxEvent(
          event.id,
          event.payload,
        );
      } else if (event.eventType === 'reservation.daily_log_pending_reminder') {
        if (!this.dailyLogReminders) {
          throw new Error('Daily-log reminder outbox handler nije dostupan.');
        }
        await this.dailyLogReminders.deliverPendingDailyLogReminder(
          event.id,
          event.payload,
        );
      } else {
        throw new Error(`Nepoznat outbox event type: ${event.eventType}`);
      }

      await this.prisma.outboxEvent.updateMany({
        where: { id: event.id, status: 'PROCESSING' },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          lockedAt: null,
          lastError: null,
        },
      });
    } catch (error) {
      const errorType = error instanceof Error ? error.name : 'Error';
      this.logger.warn(
        `Reservation outbox ${eventId} delivery failed (${errorType}, attempt ${attempts}/${MAX_ATTEMPTS}).`,
      );
      if (!claimed) return;

      const retryDelay = Math.min(
        MAX_RETRY_DELAY_MS,
        1000 * 2 ** Math.min(Math.max(attempts, 1), 12),
      );
      const terminal = attempts >= MAX_ATTEMPTS;
      try {
        await this.prisma.outboxEvent.updateMany({
          where: { id: eventId, status: 'PROCESSING' },
          data: {
            status: terminal ? 'DEAD_LETTER' : 'PENDING',
            nextAttemptAt: new Date(Date.now() + retryDelay),
            lockedAt: null,
            lastError: `Delivery failed (${errorType}).`,
          },
        });
      } catch (updateError) {
        const updateType =
          updateError instanceof Error ? updateError.name : 'Error';
        this.logger.error(
          `Reservation outbox ${eventId} could not be requeued (${updateType}).`,
        );
      }
    }
  }

  async requestManualReplay(eventId: string, requestedByUserId: string) {
    const requestedAt = new Date();
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.outboxEvent.findUnique({
        where: { id: eventId },
        select: { id: true, eventType: true, status: true, attempts: true },
      });
      if (
        !event ||
        !SUPPORTED_EVENT_TYPES.some((eventType) => eventType === event.eventType)
      ) {
        throw new NotFoundException('Outbox događaj nije pronađen.');
      }
      if (event.status !== 'DEAD_LETTER') {
        throw new ConflictException(
          'Ručni replay je dozvoljen samo za DEAD_LETTER događaj.',
        );
      }

      const requeued = await tx.outboxEvent.updateMany({
        where: {
          id: event.id,
          eventType: { in: [...SUPPORTED_EVENT_TYPES] },
          status: 'DEAD_LETTER',
        },
        data: {
          status: 'PENDING',
          nextAttemptAt: requestedAt,
          lockedAt: null,
          deliveredAt: null,
        },
      });
      if (requeued.count !== 1) {
        throw new ConflictException(
          'Outbox događaj je promijenjen; osvježite dijagnostiku.',
        );
      }

      const audit = await tx.reservationOutboxReplayAudit.create({
        data: {
          outboxEventId: event.id,
          requestedByUserId,
          attemptsAtRequest: event.attempts,
          requestedAt,
        },
        select: { id: true },
      });

      return {
        eventId: event.id,
        replayAuditId: audit.id,
        status: 'PENDING',
        attempts: event.attempts,
        nextAttemptAt: requestedAt,
      };
    });
  }

  async getDiagnostics() {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - DELIVERY_LEASE_MS);
    const [statusGroups, duePending, staleProcessing, recentEvents] =
      await Promise.all([
        this.prisma.outboxEvent.groupBy({
          by: ['status'],
          where: { eventType: { in: [...SUPPORTED_EVENT_TYPES] } },
          _count: { _all: true },
        }),
        this.prisma.outboxEvent.count({
          where: {
            eventType: { in: [...SUPPORTED_EVENT_TYPES] },
            status: 'PENDING',
            nextAttemptAt: { lte: now },
          },
        }),
        this.prisma.outboxEvent.count({
          where: {
            eventType: { in: [...SUPPORTED_EVENT_TYPES] },
            status: 'PROCESSING',
            lockedAt: { lt: staleBefore },
          },
        }),
        this.prisma.outboxEvent.findMany({
          where: {
            eventType: { in: [...SUPPORTED_EVENT_TYPES] },
            status: { in: ['PENDING', 'PROCESSING', 'DEAD_LETTER'] },
          },
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
          take: DIAGNOSTICS_EVENT_LIMIT,
          select: {
            id: true,
            eventType: true,
            status: true,
            attempts: true,
            nextAttemptAt: true,
            lockedAt: true,
            lastError: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      ]);

    return {
      generatedAt: now,
      counts: Object.fromEntries(
        statusGroups.map(({ status, _count }) => [status, _count._all]),
      ),
      duePending,
      staleProcessing,
      recentEvents: recentEvents.map((event) => ({
        ...event,
        lastError: this.sanitizeDiagnosticError(event.lastError),
      })),
    };
  }

  private sanitizeDiagnosticError(error: string | null): string | null {
    if (!error) return null;
    if (error === 'Expired delivery lease recovered.') return error;
    if (error === 'Expired delivery lease reached the attempt limit.') {
      return error;
    }
    const safeDeliveryError = error.match(
      /^Delivery failed \(([A-Za-z][A-Za-z0-9_]{0,63})\)\.$/,
    );
    if (safeDeliveryError) return `Delivery failed (${safeDeliveryError[1]}).`;
    return 'Previous error detail redacted.';
  }

  @Cron('*/1 * * * *', {
    timeZone: DEFAULT_SALON_TIMEZONE,
    waitForCompletion: true,
  })
  async retryPending(): Promise<void> {
    const now = new Date();
    const expiredBefore = new Date(now.getTime() - DELIVERY_LEASE_MS);
    try {
      await this.prisma.outboxEvent.updateMany({
        where: {
          eventType: { in: [...SUPPORTED_EVENT_TYPES] },
          status: 'PROCESSING',
          lockedAt: { lt: expiredBefore },
          attempts: { lt: MAX_ATTEMPTS },
        },
        data: {
          status: 'PENDING',
          nextAttemptAt: now,
          lockedAt: null,
          lastError: 'Expired delivery lease recovered.',
        },
      });
      await this.prisma.outboxEvent.updateMany({
        where: {
          eventType: { in: [...SUPPORTED_EVENT_TYPES] },
          status: 'PROCESSING',
          lockedAt: { lt: expiredBefore },
          attempts: { gte: MAX_ATTEMPTS },
        },
        data: {
          status: 'DEAD_LETTER',
          lockedAt: null,
          lastError: 'Expired delivery lease reached the attempt limit.',
        },
      });
      const pending = await this.prisma.outboxEvent.findMany({
        where: {
          eventType: { in: [...SUPPORTED_EVENT_TYPES] },
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
      this.logger.warn(`Reservation outbox retry scan failed (${errorType}).`);
    }
  }
}
