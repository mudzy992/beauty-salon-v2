import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getServiceAmount } from './daily-log.amounts';
import { NotificationsService } from '../notifications/notifications.service';
import { buildReceiptCopy } from '../notifications/utils/reservation-push-copy';

@Injectable()
export class DailyLogReceiptService {
  private readonly logger = new Logger(DailyLogReceiptService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async sendPaymentReceiptIfApplicable(entryId: string): Promise<void> {
    const entry = await this.prisma.dailyLogEntry.findUnique({
      where: { id: entryId },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: { service: { select: { name: true } } },
        },
        client: {
          select: {
            id: true,
            email: true,
            isEmailVerified: true,
            firstName: true,
          },
        },
        stylistProfile: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!entry || entry.kind !== 'SERVICE' || !entry.clientId || !entry.client) {
      return;
    }
    const actualPrice = Number(entry.actualPrice);
    const tipAmount = Number(entry.tipAmount);
    const serviceAmount = getServiceAmount(entry.actualPrice, entry.tipAmount);
    const stylistUser = entry.stylistProfile?.user;
    const stylistName = stylistUser
      ? [stylistUser.firstName, stylistUser.lastName].filter(Boolean).join(' ')
      : '';
    const receiptLabel = entry.publicReferenceCode || entryId.slice(0, 8);
    const copy = buildReceiptCopy({ ref: receiptLabel, amount: actualPrice });
    await this.notifications.send({
      userId: entry.clientId,
      title: copy.title,
      body: copy.body,
      type: 'payment_receipt',
      channel: 'PUSH',
      data: {
        kind: 'payment_receipt',
        dailyLogEntryId: entry.id,
        publicReferenceCode: entry.publicReferenceCode,
        ...(entry.reservationId ? { reservationId: entry.reservationId } : {}),
      },
    });
    const email = entry.client.email?.trim();
    if (email && entry.client.isEmailVerified) {
      await this.notifications.sendPaymentReceiptEmail({
        to: email,
        firstName: entry.client.firstName,
        publicReferenceCode: entry.publicReferenceCode,
        reservationId: entry.reservationId,
        items: entry.items.map((item) => ({
          name: item.service.name,
          unitPrice: Number(item.unitPrice),
        })),
        actualPrice,
        tipAmount,
        serviceAmount,
        loyaltyDiscountAmount: Number(entry.loyaltyDiscountAmount),
        stylistName,
        completedAt: entry.completedAt ?? new Date(),
      });
    }
  }

  notifyAfterComplete(entryId: string): void {
    void this.sendPaymentReceiptIfApplicable(entryId).catch((err: unknown) => {
      this.logger.warn(
        `Payment receipt notification failed for ${entryId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    });
  }
}
