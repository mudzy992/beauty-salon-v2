import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toLocalDateOnlyString } from '../common/utils/date-only';
import { getStylistIdsForServices } from './utils/availability-helpers';
import { AvailabilitySlotsService } from './availability-slots.service';
import type { AvailableDateDto } from './availability.types';

@Injectable()
export class AvailabilityDatesService {
  private readonly logger = new Logger(AvailabilityDatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly slotsService: AvailabilitySlotsService,
  ) {}

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

    const stylistIds = await getStylistIdsForServices(this.prisma, normalized);

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

    return Promise.all(
      results.map(async (row) => {
        if (!row.available) return row;
        const slots = await this.slotsService.getAvailableSlots(normalized, row.date);
        return { date: row.date, available: slots.length > 0 };
      }),
    );
  }
}
