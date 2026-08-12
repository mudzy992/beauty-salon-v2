import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export type PendingRescheduleKind =
  | 'reservation_reschedule'
  | 'reservation_reorder'
  | null;

@Injectable()
export class ReservationNotifyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async getPendingRescheduleKind(
    reservationId: string,
  ): Promise<PendingRescheduleKind> {
    const latest = await this.prisma.notification.findFirst({
      where: {
        type: {
          in: ['reservation_reschedule', 'reservation_reminder'] as any,
        },
        data: { path: '$.reservationId', equals: reservationId },
      },
      orderBy: { sentAt: 'desc' },
      select: { type: true, data: true },
    });
    const kind =
      latest?.data &&
      typeof latest.data === 'object' &&
      (latest.data as Record<string, unknown>).kind;
    if (kind === 'reservation_reorder') return 'reservation_reorder';
    if (kind === 'reservation_reschedule') return 'reservation_reschedule';
    return null;
  }

  async notifyStylistAboutClientDecision(
    reservationId: string,
    decision: 'accepted' | 'declined' | 'timeout_cancelled',
  ) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        confirmedStylist: { select: { userId: true } },
        service: { select: { name: true } },
      },
    });
    const stylistUserId = reservation?.confirmedStylist?.userId;
    if (!stylistUserId) return;
    const title =
      decision === 'accepted'
        ? 'Klijent potvrdio novi termin'
        : decision === 'declined'
          ? 'Klijent odbio novi termin'
          : 'Termin auto-otkazan';
    const body =
      decision === 'accepted'
        ? `Klijent je potvrdio novi termin za ${reservation?.service?.name ?? 'uslugu'}.`
        : decision === 'declined'
          ? `Klijent je odbio predloženi termin za ${reservation?.service?.name ?? 'uslugu'}.`
          : `Klijent nije odgovorio na vrijeme. Termin je auto-otkazan.`;
    await this.notifications.send({
      userId: stylistUserId,
      title,
      body,
      type: 'reservation_reminder',
      data: {
        reservationId,
        kind: 'stylist_reschedule_decision',
        decision,
      },
      channel: 'PUSH',
    });
  }
}
