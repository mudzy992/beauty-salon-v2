import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toLocalDateOnlyString } from '../common/utils/date-only';
import { getDayStartEnd } from '../common/utils/date-range';
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

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAvailableDates(
    serviceIdsInput: string[] | string,
    fromDate: Date,
    toDate?: Date,
  ): Promise<AvailableDateDto[]> {
    const serviceIds = Array.isArray(serviceIdsInput)
      ? serviceIdsInput
      : [serviceIdsInput];
    const salon = await this.prisma.salonSettings.findFirst();
    if (!salon) throw new NotFoundException('Salon nije konfigurisan.');

    const normalized = [...new Set(serviceIds.map((x) => x.trim()).filter(Boolean))];
    if (normalized.length === 0)
      throw new NotFoundException('Servis nije pronađen.');
    const services = await this.prisma.service.findMany({
      where: { id: { in: normalized } },
      select: { id: true },
    });
    if (services.length !== normalized.length)
      throw new NotFoundException('Servis nije pronađen.');

    const stylistIds = await this.getStylistIdsForServices(normalized);

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
    const holidayDates = new Set(holidays.map((h) => toLocalDateOnlyString(h.date)));

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
        .map((w) => toLocalDateOnlyString(w.dateOverride!)),
    );

    this.logger.debug(
      `Availability check: services=${normalized.join(',')}, stylists=${stylistIds.length}, ` +
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
      const dateStr = toLocalDateOnlyString(cursor);

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
    serviceIdsInput: string[] | string,
    dateStr: string,
  ): Promise<AvailableSlotDto[]> {
    const serviceIds = Array.isArray(serviceIdsInput)
      ? serviceIdsInput
      : [serviceIdsInput];
    const salon = await this.prisma.salonSettings.findFirst();
    if (!salon) throw new NotFoundException('Salon nije konfigurisan.');

    const normalized = [...new Set(serviceIds.map((x) => x.trim()).filter(Boolean))];
    if (normalized.length === 0)
      throw new NotFoundException('Servis nije pronađen.');
    const services = await this.prisma.service.findMany({
      where: { id: { in: normalized } },
      select: { id: true, durationMinutes: true },
    });
    if (services.length !== normalized.length)
      throw new NotFoundException('Servis nije pronađen.');
    const totalDurationMinutes = services.reduce(
      (acc, s) => acc + (s.durationMinutes ?? 0),
      0,
    );

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
      normalized,
      dayOfWeek,
      dateStr,
    );
    if (stylists.length === 0) return [];

    const slots = generateSlots(
      salonHours.openTime,
      salonHours.closeTime,
      totalDurationMinutes,
      salon.pauseBetweenServices,
    );

    // Za današnji dan: slotovi koji su već prošli ne trebaju biti dostupni.
    const todayStr = toLocalDateOnlyString(new Date());
    const nowMinutes = timeToMinutes(
      `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
    );
    const filteredSlots =
      dateStr === todayStr
        ? slots.filter((s) => timeToMinutes(s.startTime) >= nowMinutes)
        : slots;

    const { start: dateStart, end: dateEnd } = getDayStartEnd(date);
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

    return filteredSlots
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

  private async getStylistIdsForServices(serviceIds: string[]): Promise<string[]> {
    const uniqueIds = [...new Set(serviceIds.map((x) => x.trim()).filter(Boolean))];
    if (uniqueIds.length === 0) return [];
    const rows = await this.prisma.stylistService.findMany({
      where: { serviceId: { in: uniqueIds } },
      select: { stylistProfileId: true, serviceId: true },
    });
    const counts = new Map<string, number>();
    for (const r of rows) {
      counts.set(r.stylistProfileId, (counts.get(r.stylistProfileId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .filter(([, c]) => c === uniqueIds.length)
      .map(([stylistProfileId]) => stylistProfileId);
  }

  private async getStylistProfilesForSlots(
    serviceIds: string[],
    dayOfWeek: number,
    dateStr: string,
  ): Promise<Array<{ id: string; window: { start: number; end: number } }>> {
    const eligibleIds = await this.getStylistIdsForServices(serviceIds);
    if (eligibleIds.length === 0) return [];
    const allStylists = await this.prisma.stylistProfile.findMany({
      where: {
        isActive: true,
        id: { in: eligibleIds },
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
        (wh) => wh.dateOverride && toLocalDateOnlyString(wh.dateOverride) === dateStr,
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
