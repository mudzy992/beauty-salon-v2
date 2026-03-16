import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  generateSlots,
  timeToMinutes,
  intervalsOverlap,
} from './utils/time-slot.utils';

export interface AvailableSlotDto {
  startTime: string;
  endTime: string;
  availableStylistCount: number;
}

export interface AvailableDateDto {
  date: string; // YYYY-MM-DD
  available: boolean;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAvailableDates(
    serviceId: string,
    fromDate: Date,
    toDate?: Date,
  ): Promise<AvailableDateDto[]> {
    const salon = await this.prisma.salonSettings.findFirst();
    if (!salon) throw new NotFoundException('Salon nije konfigurisan.');

    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true },
    });
    if (!service) throw new NotFoundException('Servis nije pronađen.');

    const stylistIds = await this.getStylistIdsForService(serviceId);

    const end = toDate
      ? new Date(toDate)
      : new Date(fromDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const salonHoursList = await this.prisma.salonWorkingHours.findMany({
      where: { salonSettingsId: salon.id },
    });
    const salonHoursByDay = new Map(
      salonHoursList.map((wh) => [wh.dayOfWeek, wh]),
    );

    const holidays = await this.prisma.holiday.findMany({
      where: {
        salonSettingsId: salon.id,
        date: { gte: fromDate, lte: end },
      },
    });
    const holidayDates = new Set(holidays.map((h) => toDateStr(h.date)));

    let stylistWH: Array<{ dayOfWeek: number; dateOverride: Date | null }> = [];
    if (stylistIds.length > 0) {
      stylistWH = await this.prisma.stylistWorkingHours.findMany({
        where: {
          stylistProfileId: { in: stylistIds },
          isWorkingDay: true,
        },
        select: { dayOfWeek: true, dateOverride: true },
      });
    }

    const stylistRegularDays = new Set(
      stylistWH.filter((w) => !w.dateOverride).map((w) => w.dayOfWeek),
    );
    const stylistOverrideDates = new Set(
      stylistWH
        .filter((w) => w.dateOverride)
        .map((w) => toDateStr(w.dateOverride!)),
    );

    this.logger.debug(
      `Availability check: service=${serviceId}, stylists=${stylistIds.length}, ` +
        `salonHoursDays=[${[...salonHoursByDay.entries()]
          .filter(([, v]) => v.isWorkingDay)
          .map(([k]) => k)
          .join(',')}], ` +
        `stylistRegularDays=[${[...stylistRegularDays].join(',')}], ` +
        `stylistOverrides=[${[...stylistOverrideDates].join(',')}]`,
    );

    const results: AvailableDateDto[] = [];
    const cursor = new Date(fromDate);
    cursor.setHours(12, 0, 0, 0);

    while (cursor <= end) {
      const dayOfWeek = cursor.getDay();
      const dateStr = localDateStr(cursor);

      if (stylistIds.length === 0) {
        results.push({ date: dateStr, available: false });
        cursor.setDate(cursor.getDate() + 1);
        continue;
      }

      const isHoliday = holidayDates.has(dateStr);
      const salonHours = salonHoursByDay.get(dayOfWeek);
      const salonOpen = !!salonHours && salonHours.isWorkingDay;
      const hasWorkingStylist =
        stylistRegularDays.has(dayOfWeek) || stylistOverrideDates.has(dateStr);

      results.push({
        date: dateStr,
        available: !isHoliday && salonOpen && hasWorkingStylist,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return results;
  }

  async getAvailableSlots(
    serviceId: string,
    dateStr: string,
  ): Promise<AvailableSlotDto[]> {
    const salon = await this.prisma.salonSettings.findFirst();
    if (!salon) throw new NotFoundException('Salon nije konfigurisan.');

    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true, durationMinutes: true },
    });
    if (!service) throw new NotFoundException('Servis nije pronađen.');

    const parts = dateStr.split('-').map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
    const dayOfWeek = date.getDay();

    const holidays = await this.prisma.holiday.findMany({
      where: {
        salonSettingsId: salon.id,
        date: {
          gte: new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0),
          lte: new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999),
        },
      },
    });
    if (holidays.length > 0) return [];

    const salonHours = await this.prisma.salonWorkingHours.findUnique({
      where: {
        salonSettingsId_dayOfWeek: {
          salonSettingsId: salon.id,
          dayOfWeek,
        },
      },
    });
    if (!salonHours || !salonHours.isWorkingDay) return [];

    const stylists = await this.getStylistProfilesForSlots(
      serviceId,
      dayOfWeek,
      dateStr,
    );
    if (stylists.length === 0) return [];

    const slots = generateSlots(
      salonHours.openTime,
      salonHours.closeTime,
      service.durationMinutes,
      salon.pauseBetweenServices,
    );

    const dateStart = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      0,
      0,
    );
    const dateEnd = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59,
      999,
    );
    const reservations = await this.prisma.reservation.findMany({
      where: {
        reservationDate: { gte: dateStart, lte: dateEnd },
        status: {
          in: [
            'PENDING',
            'STYLIST_REVIEW',
            'CONFIRMED',
            'ATTENDANCE_CONFIRMED',
            'IN_PROGRESS',
          ],
        },
      },
      select: { startTime: true, endTime: true, confirmedStylistId: true },
    });

    return slots
      .map((slot) => {
        const slotStart = timeToMinutes(slot.startTime);
        const slotEnd = timeToMinutes(slot.endTime);
        let count = 0;
        for (const sp of stylists) {
          if (slotStart < sp.window.end && slotEnd > sp.window.start) {
            const busy = reservations.some((r) => {
              if (
                r.confirmedStylistId != null &&
                r.confirmedStylistId !== sp.id
              )
                return false;
              const rStart = timeToMinutes(r.startTime);
              const rEnd = timeToMinutes(r.endTime);
              return intervalsOverlap(slotStart, slotEnd, rStart, rEnd);
            });
            if (!busy) count++;
          }
        }
        return {
          startTime: slot.startTime,
          endTime: slot.endTime,
          availableStylistCount: count,
        };
      })
      .filter((s) => s.availableStylistCount > 0);
  }

  async debugAvailability(serviceId: string) {
    const salon = await this.prisma.salonSettings.findFirst();
    if (!salon) return { error: 'Salon nije konfigurisan' };

    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true, name: true },
    });
    if (!service) return { error: 'Servis nije pronađen', serviceId };

    const stylistServiceRows = await this.prisma.stylistService.findMany({
      where: { serviceId },
      include: {
        stylistProfile: {
          select: {
            id: true,
            isActive: true,
            userId: true,
            user: {
              select: { username: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    const stylistIds = stylistServiceRows.map((r) => r.stylistProfileId);

    const salonHours = await this.prisma.salonWorkingHours.findMany({
      where: { salonSettingsId: salon.id },
      orderBy: { dayOfWeek: 'asc' },
    });

    const DAYS = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    let stylistWorkingHours: any[] = [];
    if (stylistIds.length > 0) {
      stylistWorkingHours = await this.prisma.stylistWorkingHours.findMany({
        where: { stylistProfileId: { in: stylistIds } },
        orderBy: [{ dayOfWeek: 'asc' }],
      });
    }

    const allStylistProfiles = await this.prisma.stylistProfile.findMany({
      select: {
        id: true,
        isActive: true,
        userId: true,
        user: { select: { username: true } },
        _count: { select: { stylistServices: true, workingHours: true } },
      },
    });

    return {
      salon: { id: salon.id, name: salon.name },
      service: { id: service.id, name: service.name },
      salonWorkingHours: salonHours.map((wh) => ({
        day: DAYS[wh.dayOfWeek],
        dayOfWeek: wh.dayOfWeek,
        openTime: wh.openTime,
        closeTime: wh.closeTime,
        isWorkingDay: wh.isWorkingDay,
      })),
      stylistsLinkedToService: stylistServiceRows.map((r) => ({
        stylistProfileId: r.stylistProfileId,
        isActive: r.stylistProfile.isActive,
        user: r.stylistProfile.user,
      })),
      stylistWorkingHoursForLinkedStylists: stylistWorkingHours.map(
        (wh: any) => ({
          stylistProfileId: wh.stylistProfileId,
          day: DAYS[wh.dayOfWeek],
          dayOfWeek: wh.dayOfWeek,
          startTime: wh.startTime,
          endTime: wh.endTime,
          isWorkingDay: wh.isWorkingDay,
          dateOverride: wh.dateOverride,
        }),
      ),
      allStylistProfiles: allStylistProfiles.map((sp) => ({
        id: sp.id,
        username: sp.user.username,
        isActive: sp.isActive,
        serviceCount: sp._count.stylistServices,
        workingHoursCount: sp._count.workingHours,
      })),
      diagnosis: {
        hasSalon: true,
        hasService: true,
        hasSalonWorkingHours: salonHours.length > 0,
        salonWorkingDays: salonHours
          .filter((wh) => wh.isWorkingDay)
          .map((wh) => DAYS[wh.dayOfWeek]),
        stylistsForThisService: stylistIds.length,
        stylistWorkingHoursCount: stylistWorkingHours.length,
        stylistWorkingDays: [
          ...new Set(
            stylistWorkingHours
              .filter((wh: any) => wh.isWorkingDay && !wh.dateOverride)
              .map((wh: any) => DAYS[wh.dayOfWeek]),
          ),
        ],
        issue:
          salonHours.length === 0
            ? 'NO_SALON_WORKING_HOURS'
            : salonHours.filter((wh) => wh.isWorkingDay).length === 0
              ? 'ALL_SALON_DAYS_DISABLED'
              : stylistIds.length === 0
                ? 'NO_STYLISTS_FOR_SERVICE'
                : stylistWorkingHours.length === 0
                  ? 'NO_STYLIST_WORKING_HOURS'
                  : stylistWorkingHours.filter((wh: any) => wh.isWorkingDay)
                        .length === 0
                    ? 'ALL_STYLIST_DAYS_DISABLED'
                    : 'NONE_DETECTED',
      },
    };
  }

  private async getStylistIdsForService(serviceId: string): Promise<string[]> {
    const rows = await this.prisma.stylistService.findMany({
      where: { serviceId },
      select: { stylistProfileId: true },
    });
    return rows.map((r) => r.stylistProfileId);
  }

  private async getStylistProfilesForSlots(
    serviceId: string,
    dayOfWeek: number,
    dateStr: string,
  ): Promise<Array<{ id: string; window: { start: number; end: number } }>> {
    const allStylists = await this.prisma.stylistProfile.findMany({
      where: {
        isActive: true,
        stylistServices: { some: { serviceId } },
      },
      include: {
        workingHours: {
          where: { isWorkingDay: true },
        },
      },
    });

    const result: Array<{
      id: string;
      window: { start: number; end: number };
    }> = [];

    for (const s of allStylists) {
      const override = s.workingHours.find(
        (wh) => wh.dateOverride && toDateStr(wh.dateOverride) === dateStr,
      );
      const regular = s.workingHours.find(
        (wh) => !wh.dateOverride && wh.dayOfWeek === dayOfWeek,
      );
      const match = override ?? regular;
      if (match) {
        result.push({
          id: s.id,
          window: {
            start: timeToMinutes(match.startTime),
            end: timeToMinutes(match.endTime),
          },
        });
      }
    }

    return result;
  }
}
