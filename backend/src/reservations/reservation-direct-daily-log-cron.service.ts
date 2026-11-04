import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

const PENDING_DAILY_LOG_REMINDER_EVENT = 'reservation.daily_log_pending_reminder';

type PendingDailyLogReminderPayload = {
  dailyLogEntryId: string;
  reservationId: string;
};

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
        dailyLogEntry: { none: { kind: 'SERVICE' } },
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

  async processPendingDailyLogReminders(): Promise<{ queuedCount: number }> {
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
      },
    });
    let queuedCount = 0;
    for (const entry of stale) {
      if (!entry.reservationId) continue;
      try {
        const payload: PendingDailyLogReminderPayload = {
          dailyLogEntryId: entry.id,
          reservationId: entry.reservationId,
        };
        const inserted = await this.prisma.outboxEvent.createMany({
          data: [
            {
              eventType: PENDING_DAILY_LOG_REMINDER_EVENT,
              aggregateId: entry.id,
              dedupeKey: `daily-log-entry:${entry.id}:pending-reminder`,
              payload: payload as unknown as Prisma.InputJsonValue,
            },
          ],
          skipDuplicates: true,
        });
        queuedCount += inserted.count;
      } catch (err) {
        this.logger.error(
          `Failed to queue daily-log reminder for entry ${entry.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    return { queuedCount };
  }

  async deliverPendingDailyLogReminder(
    eventId: string,
    rawPayload: unknown,
  ): Promise<void> {
    const payload = this.parsePendingReminderPayload(rawPayload);
    const entry = await this.prisma.dailyLogEntry.findUnique({
      where: { id: payload.dailyLogEntryId },
      select: {
        id: true,
        reservationId: true,
        status: true,
        deletedAt: true,
        pendingReminderSentAt: true,
        createdAt: true,
        stylistProfile: { select: { userId: true } },
        reservation: {
          select: { status: true, publicReferenceCode: true },
        },
      },
    });

    if (
      !entry ||
      entry.reservationId !== payload.reservationId ||
      entry.status !== 'PENDING' ||
      entry.deletedAt !== null ||
      entry.pendingReminderSentAt !== null ||
      !entry.reservation ||
      entry.reservation.status !== RESERVATION_STATUS.AWAITING_DAILY_LOG ||
      !entry.stylistProfile.userId
    ) {
      return;
    }

    const hours = await this.dates.getDailyLogReminderHours();
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    if (entry.createdAt.getTime() > cutoff.getTime()) return;

    await this.notify.notifyStylistPendingDailyLog({
      stylistUserId: entry.stylistProfile.userId,
      reservationId: payload.reservationId,
      dailyLogEntryId: entry.id,
      publicReferenceCode: entry.reservation.publicReferenceCode,
      sourceEventId: eventId,
    });
    await this.prisma.dailyLogEntry.updateMany({
      where: {
        id: entry.id,
        reservationId: payload.reservationId,
        status: 'PENDING',
        deletedAt: null,
        pendingReminderSentAt: null,
      },
      data: { pendingReminderSentAt: new Date() },
    });
  }

  private parsePendingReminderPayload(rawPayload: unknown): PendingDailyLogReminderPayload {
    if (
      !rawPayload ||
      typeof rawPayload !== 'object' ||
      !('dailyLogEntryId' in rawPayload) ||
      typeof rawPayload.dailyLogEntryId !== 'string' ||
      !('reservationId' in rawPayload) ||
      typeof rawPayload.reservationId !== 'string'
    ) {
      throw new Error('Neispravan pending daily-log reminder payload.');
    }
    return rawPayload as PendingDailyLogReminderPayload;
  }
}
