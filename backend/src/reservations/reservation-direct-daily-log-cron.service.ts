import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DailyLogSeedFromDirectService } from '../daily-log/daily-log-seed-from-direct.service';
import { ReservationDateService } from './reservation-date.service';
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
  ) {}

  async processDirectBookingDailyLogSeeds(): Promise<{ seededCount: number }> {
    const now = new Date();
    const lookback = new Date(now);
    lookback.setDate(lookback.getDate() - 7);

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
}
