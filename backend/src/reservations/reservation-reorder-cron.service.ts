import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ReservationDateService } from './reservation-date.service';
import { ReservationSharedService } from './reservation-shared.service';
import { RESERVATION_STATUS } from './constants';
import { minutesToTime, timeToMinutes } from './utils/time-slot.utils';

@Injectable()
export class ReservationReorderCronService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly dates: ReservationDateService,
    private readonly shared: ReservationSharedService,
  ) {}

  async processAutoReordersAfterAttendanceCancellations() {
    const salon = await this.prisma.salonSettings.findFirst();
    if (!salon) return { proposedCount: 0 };
    const now = new Date();
    const today = this.dates.parseDateOnly(now);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const dayAfterTomorrow = new Date(
      tomorrow.getTime() + 24 * 60 * 60 * 1000,
    );
    const attendanceConfirmed =
      await this.prisma.reservation.findMany({
        where: {
          status: RESERVATION_STATUS.ATTENDANCE_CONFIRMED,
          confirmedStylistId: { not: null },
          rescheduleStatus: { not: 'PENDING' },
          reservationDate: { gte: today, lt: dayAfterTomorrow },
        },
        select: {
          id: true,
          clientId: true,
          confirmedStylistId: true,
          reservationDate: true,
          startTime: true,
          endTime: true,
          rescheduleStatus: true,
        },
        orderBy: [
          { confirmedStylistId: 'asc' },
          { reservationDate: 'asc' },
          { startTime: 'asc' },
        ],
      });
    const nowDateStr = this.dates.toLocalDateOnlyString(now);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const byKey = new Map<string, typeof attendanceConfirmed>();
    for (const r of attendanceConfirmed) {
      const key = `${r.confirmedStylistId}|${this.dates.toLocalDateOnlyString(r.reservationDate)}`;
      const list = byKey.get(key);
      if (list) list.push(r);
      else byKey.set(key, [r]);
    }
    let proposedCount = 0;
    for (const [key, list] of byKey.entries()) {
      const [stylistProfileId, dateStr] = key.split('|');
      if (!stylistProfileId || !dateStr) continue;
      const hours = await this.getWorkingHoursForDate(
        salon.id,
        dateStr,
      );
      if (!hours) continue;
      proposedCount += await this.proposeEarlierSlots(
        list,
        hours,
        salon.pauseBetweenServices ?? 0,
        dateStr === nowDateStr ? nowMinutes : 0,
      );
    }
    return { proposedCount };
  }

  private async proposeEarlierSlots(
    list: Array<{
      id: string;
      clientId: string;
      reservationDate: Date;
      startTime: string;
      endTime: string;
    }>,
    hours: { openTime: string; closeTime: string },
    pause: number,
    nowMinutes: number,
  ): Promise<number> {
    const openMin = timeToMinutes(hours.openTime);
    const closeMin = timeToMinutes(hours.closeTime);
    let prevOriginalEnd = openMin;
    let proposed = 0;
    for (const r of list) {
      const duration =
        timeToMinutes(r.endTime) - timeToMinutes(r.startTime);
      if (duration <= 0) {
        prevOriginalEnd = Math.max(
          prevOriginalEnd,
          timeToMinutes(r.endTime),
        );
        continue;
      }
      let earliestStart = Math.max(openMin, prevOriginalEnd + pause);
      if (nowMinutes > 0)
        earliestStart = Math.max(earliestStart, nowMinutes);
      const originalStart = timeToMinutes(r.startTime);
      if (
        earliestStart < originalStart &&
        earliestStart + duration <= closeMin
      ) {
        const targetStartTime = minutesToTime(earliestStart);
        const targetEndTime = minutesToTime(earliestStart + duration);
        const updated = await this.prisma.reservation.updateMany({
          where: {
            id: r.id,
            status: RESERVATION_STATUS.ATTENDANCE_CONFIRMED,
            rescheduleStatus: { not: 'PENDING' },
          },
          data: {
            rescheduleProposedStartTime: targetStartTime,
            rescheduleProposedEndTime: targetEndTime,
            rescheduleStatus: 'PENDING',
          },
        });
        if (updated.count > 0) {
          proposed++;
          const sentAt = new Date();
          const confirmIn =
            this.shared.computeRescheduleDeadlineMinutes(
              sentAt,
              targetStartTime,
              r.reservationDate,
            );
          await this.notifications.send({
            userId: r.clientId,
            title: 'Oslobodilo se ranije vrijeme',
            body: `Možete prebaciti termin na ${targetStartTime}–${targetEndTime}. Potvrdite u narednih ${confirmIn} min.`,
            type: 'reservation_reminder',
            data: {
              kind: 'reservation_reorder',
              reservationId: r.id,
              confirmationDeadlineMinutes: confirmIn,
              createdAt: sentAt.toISOString(),
            },
            channel: 'PUSH',
          });
        }
      }
      prevOriginalEnd = timeToMinutes(r.endTime);
    }
    return proposed;
  }

  private async getWorkingHoursForDate(
    salonSettingsId: string,
    dateStr: string,
  ) {
    const dateParts = dateStr.split('-').map((x) => Number(x));
    const date = new Date(
      dateParts[0],
      dateParts[1] - 1,
      dateParts[2],
      12,
      0,
      0,
      0,
    );
    const dayOfWeek = date.getDay();
    const hours = await this.prisma.salonWorkingHours.findUnique({
      where: {
        salonSettingsId_dayOfWeek: { salonSettingsId, dayOfWeek },
      },
      select: {
        isWorkingDay: true,
        openTime: true,
        closeTime: true,
      },
    });
    if (!hours?.isWorkingDay) return null;
    return hours;
  }
}
