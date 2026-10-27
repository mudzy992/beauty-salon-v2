import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DailyLogSeedFromDirectService } from '../daily-log/daily-log-seed-from-direct.service';
import { ReservationDateService } from './reservation-date.service';
import { ReservationNotifyService } from './reservation-notify.service';
import {
  addDateOnlyDays,
  parseDateOnlyString,
} from '../common/utils/date-only';
import {
  RESERVATION_ACCEPTANCE_MODE,
  RESERVATION_ATTENDANCE_POLICY,
  RESERVATION_STATUS,
} from './constants';

@Injectable()
export class ReservationDirectDailyLogCronService {
  private readonly logger = new Logger(ReservationDirectDailyLogCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dates: ReservationDateService,
    private readonly seed: DailyLogSeedFromDirectService,
    private readonly notify: ReservationNotifyService,
  ) {}

  async processDirectBookingDailyLogSeeds(): Promise<{ seededCount: number }> {
    const now = new Date();
    const today = this.dates.toSalonDateOnlyString(now);
    const lookback = parseDateOnlyString(addDateOnlyDays(today, -7));

    const candidates = await this.prisma.reservation.findMany({
      where: {
        acceptanceMode: RESERVATION_ACCEPTANCE_MODE.DIRECT_ASSIGN,
        attendancePolicy: RESERVATION_ATTENDANCE_POLICY.STAFF_WAIVED,
        status: {
          in: [
            RESERVATION_STATUS.CONFIRMED,
            RESERVATION_STATUS.IN_PROGRESS,
          ] as string[],
        },
        confirmedStylistId: { not: null },
        reservationDate: { gte: lookback },
        dailyLogEntry: { none: { deletedAt: null } },
      },
      select: {
        id: true,
        reservationDate: true,
        endTime: true,
      },
    });

    let seededCount = 0;
    for (const r of candidates) {
      const endAt = this.dates.combineDateAndTime(r.reservationDate, r.endTime);
      if (endAt.getTime() > now.getTime()) continue;
      try {
        const seeded = await this.seed.seedPendingFromDirectReservation(r.id);
        if (seeded) seededCount += 1;
      } catch (err) {
        this.logger.error(
          `Failed to seed daily log for reservation ${r.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    return { seededCount };
  }

  async processPendingDailyLogReminders(): Promise<{ remindedCount: number }> {
    const hours = await this.dates.getDailyLogReminderHours();
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const stale = await this.prisma.dailyLogEntry.findMany({
      where: {
        status: 'PENDING',
        deletedAt: null,
        pendingReminderSentAt: null,
        createdAt: { lte: cutoff },
        reservationId: { not: null },
        reservation: { status: RESERVATION_STATUS.AWAITING_DAILY_LOG },
      },
      select: {
        id: true,
        reservationId: true,
        stylistProfile: { select: { userId: true } },
        reservation: { select: { publicReferenceCode: true } },
      },
    });
    let remindedCount = 0;
    for (const entry of stale) {
      if (!entry.reservationId || !entry.stylistProfile.userId) continue;
      try {
        await this.notify.notifyStylistPendingDailyLog({
          stylistUserId: entry.stylistProfile.userId,
          reservationId: entry.reservationId,
          dailyLogEntryId: entry.id,
          publicReferenceCode: entry.reservation?.publicReferenceCode,
        });
        await this.prisma.dailyLogEntry.update({
          where: { id: entry.id },
          data: { pendingReminderSentAt: new Date() },
        });
        remindedCount += 1;
      } catch (err) {
        this.logger.error(
          `Failed daily-log reminder for entry ${entry.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    return { remindedCount };
  }
}
