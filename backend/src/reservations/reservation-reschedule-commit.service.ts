import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { resolvePushContext } from '../notifications/utils/load-reservation-push-context';
import { buildRescheduleShiftCopy } from '../notifications/utils/reservation-push-copy';
import { ReservationSharedService } from './reservation-shared.service';
import {
  ReservationRescheduleService,
  type RescheduleMode,
} from './reservation-reschedule.service';
import { assertClientDayBookingAllowed } from './utils/assert-client-day-booking';

@Injectable()
export class ReservationRescheduleCommitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly shared: ReservationSharedService,
    private readonly rescheduleSvc: ReservationRescheduleService,
  ) {}

  async commitReschedule(
    reservationId: string,
    userId: string,
    opts: {
      includeBreaks: boolean;
      mode?: RescheduleMode;
      manualShiftMinutes?: number;
    },
  ) {
    const proposal = await this.rescheduleSvc.proposeReschedule(
      reservationId,
      userId,
      opts,
    );
    if (opts.mode === 'use_break_only') {
      await this.prisma.reservation.update({
        where: { id: reservationId },
        data: {
          useBreakAfterOverrun: true,
          useBreakDecidedAt: new Date(),
        },
      });
      return proposal;
    }
    if (!proposal.items.length) return proposal;
    const proposedIds = proposal.items.map((item) => item.id);
    const rows = await this.prisma.reservation.findMany({
      where: { id: { in: proposedIds } },
      select: {
        id: true,
        clientId: true,
        reservationDate: true,
        serviceId: true,
        items: { select: { serviceId: true } },
      },
    });
    for (const item of proposal.items) {
      const row = rows.find((candidate) => candidate.id === item.id);
      if (!row) continue;
      const serviceIds =
        row.items.length > 0
          ? row.items.map((entry) => entry.serviceId)
          : [row.serviceId];
      await assertClientDayBookingAllowed({
        prisma: this.prisma,
        clientId: item.clientId,
        reservationDate: row.reservationDate,
        startTime: item.newStartTime,
        endTime: item.newEndTime,
        serviceIds,
        excludeReservationId: item.id,
      });
    }
    await this.prisma.$transaction(async (tx) => {
      for (const item of proposal.items) {
        await tx.reservation.update({
          where: { id: item.id },
          data: {
            rescheduleProposedStartTime: item.newStartTime,
            rescheduleProposedEndTime: item.newEndTime,
            rescheduleStatus: 'PENDING',
            useBreakAfterOverrun:
              opts.mode === 'use_break_only' ? true : null,
            useBreakDecidedAt:
              opts.mode === 'use_break_only' ? new Date() : null,
          },
        });
      }
    });
    for (const item of proposal.items) {
      const row = rows.find((candidate) => candidate.id === item.id);
      const ctx = await resolvePushContext(this.prisma, item.id);
      const sentAt = new Date();
      const confirmIn = row
        ? this.shared.computeRescheduleDeadlineMinutes(
            sentAt,
            item.newStartTime,
            row.reservationDate,
          )
        : 30;
      const copy = buildRescheduleShiftCopy(
        {
          ...ctx,
          startTime: item.newStartTime,
          endTime: item.newEndTime,
        },
        item.shiftMinutes,
        confirmIn,
      );
      await this.notifications.send({
        userId: item.clientId,
        title: copy.title,
        body: copy.body,
        type: 'reservation_reschedule',
        data: {
          kind: 'reservation_reschedule',
          reservationId: item.id,
          mode: opts.mode ?? 'actual_overrun',
          shiftMinutes: item.shiftMinutes,
          confirmationDeadlineMinutes: confirmIn,
          createdAt: sentAt.toISOString(),
        },
        channel: 'PUSH',
      });
    }
    return proposal;
  }
}
