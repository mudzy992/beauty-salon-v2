import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../events/events.gateway';
import { SOCKET_EVENTS } from '../events/socket-events';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ReservationQueriesService } from './reservation-queries.service';

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
  ) {}

  /**
   * Delivers one committed outbox event after the booking transaction has
   * finished. Failed delivery leaves a durable PENDING row for a future worker
   * or an idempotent HTTP replay; external I/O is never run in the booking tx.
   */
  async dispatchAfterCommit(eventId: string): Promise<void> {
    let claimed = false;
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

      const event = await this.prisma.outboxEvent.findUnique({
        where: { id: eventId },
      });
      if (!event) return;
      if (event.eventType !== 'reservation.created') {
        throw new Error(`Nepoznat outbox event type: ${event.eventType}`);
      }

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
      const message =
        error instanceof Error
          ? error.message
          : 'Greška pri isporuci outbox događaja.';
      this.logger.warn(`Outbox event ${eventId} nije isporučen: ${message}`);
      if (claimed) {
        try {
          await this.prisma.outboxEvent.updateMany({
            where: { id: eventId, status: 'PROCESSING' },
            data: {
              status: 'PENDING',
              nextAttemptAt: new Date(),
              lockedAt: null,
              lastError: message.slice(0, 2000),
            },
          });
        } catch (updateError) {
          const updateMessage =
            updateError instanceof Error
              ? updateError.message
              : 'Nepoznata greška pri vraćanju outbox događaja u red.';
          this.logger.error(
            `Outbox event ${eventId} ostao je u nepoznatom stanju: ${updateMessage}`,
          );
        }
      }
    }
  }
}
