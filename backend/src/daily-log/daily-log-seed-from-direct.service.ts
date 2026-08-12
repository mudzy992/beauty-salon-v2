import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { SOCKET_EVENTS } from '../events/socket-events';
import { RESERVATION_STATUS } from '../reservations/constants';
import { assertReservationTransition } from '../reservations/assert-reservation-transition';
import { shouldAutoSeedDailyLog } from '../reservations/reservation-policy';
import { allocateDailyLogReferenceCode } from './daily-log.reference';

@Injectable()
export class DailyLogSeedFromDirectService {
  private readonly logger = new Logger(DailyLogSeedFromDirectService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  async seedPendingFromDirectReservation(reservationId: string): Promise<boolean> {
    const res = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        items: { include: { service: { select: { id: true, price: true } } } },
        service: { select: { id: true, price: true } },
        dailyLogEntry: { where: { deletedAt: null }, take: 1, select: { id: true } },
      },
    });
    if (!res) return false;
    if (res.dailyLogEntry.length > 0) return false;
    if (!shouldAutoSeedDailyLog(res)) return false;

    const base =
      res.items && res.items.length > 0
        ? res.items.reduce((acc, it) => acc + Number(it.service?.price ?? 0), 0)
        : Number(res.service?.price ?? 0);
    const loyaltyDiscountAmount = Number(res.loyaltyDiscountAmount ?? 0);
    const minCharge = Math.max(0, base - loyaltyDiscountAmount);
    const resServiceIds = res.items?.length
      ? res.items.map((i) => i.serviceId)
      : [res.serviceId];
    const primaryServiceId = resServiceIds[0]!;
    const date = new Date(res.reservationDate);
    date.setHours(0, 0, 0, 0);

    const publicReferenceCode = await allocateDailyLogReferenceCode(
      this.prisma,
      date,
    );

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.dailyLogEntry.findFirst({
        where: { reservationId: res.id, deletedAt: null },
        select: { id: true },
      });
      if (existing) return;

      assertReservationTransition(
        res.status,
        RESERVATION_STATUS.AWAITING_DAILY_LOG,
      );

      const created = await tx.dailyLogEntry.create({
        data: {
          stylistProfileId: res.confirmedStylistId!,
          reservationId: res.id,
          serviceId: primaryServiceId,
          clientId: res.clientId,
          date,
          actualPrice: minCharge,
          tipAmount: 0,
          loyaltyDiscountAmount,
          publicReferenceCode,
          kind: 'SERVICE',
          isManual: false,
          status: 'PENDING',
        },
      });

      const itemRows =
        res.items && res.items.length > 0
          ? res.items.map((it, idx) => ({
              dailyLogEntryId: created.id,
              serviceId: it.serviceId,
              unitPrice: Number(it.service?.price ?? 0),
              sortOrder: idx,
            }))
          : [
              {
                dailyLogEntryId: created.id,
                serviceId: primaryServiceId,
                unitPrice: Number(res.service?.price ?? 0),
                sortOrder: 0,
              },
            ];
      await tx.dailyLogEntryServiceItem.createMany({ data: itemRows });

      await tx.reservation.update({
        where: { id: res.id },
        data: { status: RESERVATION_STATUS.AWAITING_DAILY_LOG },
      });
    });

    this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_UPDATED, {
      id: reservationId,
      status: RESERVATION_STATUS.AWAITING_DAILY_LOG,
    });
    this.events.emitToStylists(SOCKET_EVENTS.RESERVATION_UPDATED, {
      id: reservationId,
      status: RESERVATION_STATUS.AWAITING_DAILY_LOG,
    });
    this.logger.log(
      `Seeded PENDING daily log for direct reservation ${reservationId}`,
    );
    return true;
  }
}
