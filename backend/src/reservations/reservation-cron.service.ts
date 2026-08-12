import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationDateService } from './reservation-date.service';
import { ReservationSharedService } from './reservation-shared.service';
import { ReservationNotifyService } from './reservation-notify.service';
import { RESERVATION_STATUS } from './constants';
import { getAutoStartEligibleStatuses } from './reservation-policy';

@Injectable()
export class ReservationCronService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dates: ReservationDateService,
    private readonly shared: ReservationSharedService,
    private readonly notify: ReservationNotifyService,
  ) {}

  async processPendingRescheduleTimeouts() {
    const pending = await this.prisma.reservation.findMany({
      where: {
        rescheduleStatus: 'PENDING',
        rescheduleProposedStartTime: { not: null },
        rescheduleProposedEndTime: { not: null },
        status: {
          in: [
            RESERVATION_STATUS.CONFIRMED,
            RESERVATION_STATUS.ATTENDANCE_CONFIRMED,
          ] as any,
        },
      },
      select: {
        id: true,
        clientId: true,
        serviceId: true,
        reservationDate: true,
        startTime: true,
        status: true,
        rescheduleProposedStartTime: true,
        rescheduleProposedEndTime: true,
      },
    });
    const now = new Date();
    for (const r of pending) {
      const latestNotice = await this.prisma.notification.findFirst({
        where: {
          userId: r.clientId,
          type: {
            in: [
              'reservation_reschedule',
              'reservation_reminder',
            ] as any,
          },
          data: { path: '$.reservationId', equals: r.id },
        },
        orderBy: { sentAt: 'desc' },
        select: { sentAt: true, data: true },
      });
      if (!latestNotice?.sentAt || !r.rescheduleProposedStartTime)
        continue;
      const deadlineMinutes =
        this.shared.computeRescheduleDeadlineMinutes(
          latestNotice.sentAt,
          r.rescheduleProposedStartTime,
          r.reservationDate,
        );
      const deadline = new Date(
        latestNotice.sentAt.getTime() + deadlineMinutes * 60 * 1000,
      );
      if (now.getTime() <= deadline.getTime()) continue;
      const data = (latestNotice.data ?? {}) as Record<string, unknown>;
      const isReorder = data.kind === 'reservation_reorder';
      const cancelStatus = !isReorder
        ? this.shared.transitionTo(
            r.status,
            RESERVATION_STATUS.CANCELLED_BY_CLIENT,
          )
        : null;
      await this.prisma.reservation.update({
        where: { id: r.id },
        data: isReorder
          ? {
              rescheduleStatus: 'DECLINED',
              rescheduleProposedStartTime: null,
              rescheduleProposedEndTime: null,
            }
          : {
              status: cancelStatus!,
              cancelledAt: now,
              cancelReason:
                'Nije potvrđen novi termin u predviđenom roku.',
              rescheduleStatus: 'DECLINED',
              rescheduleProposedStartTime: null,
              rescheduleProposedEndTime: null,
            },
      });
      if (!isReorder) {
        const salon = await this.prisma.salonSettings.findFirst();
        if (salon) {
          await this.shared.incrementCancellationCount(r.clientId, {
            maxCancellationsBeforePenalty:
              salon.maxCancellationsBeforePenalty,
            penaltyDurationDays: salon.penaltyDurationDays,
          });
        }
      }
      await this.notify.notifyStylistAboutClientDecision(
        r.id,
        'timeout_cancelled',
      );
    }
  }

  async autoStartUpcomingReservations() {
    const now = new Date();
    const todayStr = this.dates.toLocalDateOnlyString(now);
    const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes(),
    ).padStart(2, '0')}`;
    const candidates = await this.prisma.reservation.findMany({
      where: {
        status: {
          in: [
            RESERVATION_STATUS.CONFIRMED,
            RESERVATION_STATUS.ATTENDANCE_CONFIRMED,
          ] as any,
        },
        confirmedStylistId: { not: null },
        startTime: { lte: nowHHMM },
      },
      select: {
        id: true,
        clientId: true,
        confirmedStylistId: true,
        reservationDate: true,
        startTime: true,
        status: true,
        attendancePolicy: true,
      },
      orderBy: { startTime: 'asc' },
    });
    for (const r of candidates) {
      if (
        !getAutoStartEligibleStatuses(r.attendancePolicy).includes(
          r.status as typeof RESERVATION_STATUS[keyof typeof RESERVATION_STATUS],
        )
      ) {
        continue;
      }
      const plannedStart = this.dates.combineDateAndTime(
        r.reservationDate,
        r.startTime,
      );
      if (plannedStart.getTime() > now.getTime()) continue;
      const ageMinutes = Math.floor(
        (now.getTime() - plannedStart.getTime()) / 60000,
      );
      if (ageMinutes > 24 * 60) continue;
      if (this.dates.toLocalDateOnlyString(plannedStart) !== todayStr)
        continue;
      const dayStart = this.dates.parseDateOnly(r.reservationDate);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      const alreadyRunning =
        await this.prisma.reservation.findFirst({
          where: {
            id: { not: r.id },
            confirmedStylistId: r.confirmedStylistId,
            reservationDate: { gte: dayStart, lte: dayEnd },
            status: RESERVATION_STATUS.IN_PROGRESS,
          },
          select: { id: true },
        });
      if (alreadyRunning) continue;
      const nextStatus = this.shared.transitionTo(
        r.status,
        RESERVATION_STATUS.IN_PROGRESS,
      );
      await this.prisma.reservation.update({
        where: { id: r.id },
        data: { status: nextStatus, startedAt: now },
      });
    }
  }
}
