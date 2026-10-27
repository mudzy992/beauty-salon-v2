import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  addDateOnlyDays,
  getDateOnlyRangeBounds,
  getDateOnlyWeekday,
  parseDateOnlyString,
  toDateOnlyString,
} from '../common/utils/date-only';
import { getStylistIdsForServices } from './utils/availability-helpers';
import { buildBookableServiceWhere } from './utils/service-eligibility';
import { AvailabilitySlotsService } from './availability-slots.service';
import type { AvailableDateDto } from './availability.types';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_AVAILABILITY_RANGE_DAYS = 90;
const MAX_CONCURRENT_SLOT_LOOKUPS = 5;

@Injectable()
export class AvailabilityDatesService {
  private readonly logger = new Logger(AvailabilityDatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly slotsService: AvailabilitySlotsService,
  ) {}

  async getAvailableDates(
    serviceIdsInput: string[] | string,
    fromDateInput: string,
    toDateInput?: string,
  ): Promise<AvailableDateDto[]> {
    const fromDate = this.normalizeDateOnlyInput(fromDateInput, 'fromDate');
    const toDate = toDateInput
      ? this.normalizeDateOnlyInput(toDateInput, 'toDate')
      : addDateOnlyDays(fromDate, 30);
    this.validateDateRange(fromDate, toDate);

    const serviceIds = Array.isArray(serviceIdsInput)
      ? serviceIdsInput
      : [serviceIdsInput];
    const salon = await this.prisma.salonSettings.findFirst();
    if (!salon) throw new NotFoundException('Salon nije konfigurisan.');

    const normalized = [
      ...new Set(serviceIds.map((x) => x.trim()).filter(Boolean)),
    ];
    if (normalized.length === 0)
      throw new NotFoundException('Servis nije pronađen.');
    const services = await this.prisma.service.findMany({
      where: buildBookableServiceWhere(normalized),
      select: { id: true },
    });
    if (services.length !== normalized.length)
      throw new NotFoundException('Servis nije pronađen.');

    const stylistIds = await getStylistIdsForServices(this.prisma, normalized);
    const { gte, lt } = getDateOnlyRangeBounds(fromDate, toDate);
    const salonHoursList = await this.prisma.salonWorkingHours.findMany({
      where: { salonSettingsId: salon.id },
    });
    const salonHoursByDay = new Map(
      salonHoursList.map((wh) => [wh.dayOfWeek, wh]),
    );

    const holidays = await this.prisma.holiday.findMany({
      where: {
        salonSettingsId: salon.id,
        date: { gte, lt },
      },
    });
    const holidayDates = new Set(holidays.map((h) => toDateOnlyString(h.date)));

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
        .map((w) => toDateOnlyString(w.dateOverride!)),
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
    const endDate = parseDateOnlyString(toDate);
    let dateStr = fromDate;
    while (parseDateOnlyString(dateStr) <= endDate) {
      const dayOfWeek = getDateOnlyWeekday(dateStr);

      if (stylistIds.length === 0) {
        results.push({ date: dateStr, available: false });
        dateStr = addDateOnlyDays(dateStr, 1);
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
      dateStr = addDateOnlyDays(dateStr, 1);
    }

    const availableRows = results
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.available);
    const resolvedResults = [...results];

    for (
      let offset = 0;
      offset < availableRows.length;
      offset += MAX_CONCURRENT_SLOT_LOOKUPS
    ) {
      const batch = availableRows.slice(
        offset,
        offset + MAX_CONCURRENT_SLOT_LOOKUPS,
      );
      const updates = await Promise.all(
        batch.map(async ({ row, index }) => ({
          index,
          date: row.date,
          available:
            (await this.slotsService.getAvailableSlots(normalized, row.date))
              .length > 0,
        })),
      );

      for (const update of updates) {
        resolvedResults[update.index] = {
          date: update.date,
          available: update.available,
        };
      }
    }

    return resolvedResults;
  }

  private normalizeDateOnlyInput(value: string, fieldName: string): string {
    try {
      parseDateOnlyString(value);
      return value;
    } catch {
      throw new BadRequestException(
        `${fieldName} mora biti važeći datum u formatu YYYY-MM-DD.`,
      );
    }
  }

  private validateDateRange(fromDate: string, toDate: string): void {
    const fromDay = parseDateOnlyString(fromDate);
    const endDay = parseDateOnlyString(toDate);
    if (endDay.getTime() < fromDay.getTime()) {
      throw new BadRequestException(
        'toDate mora biti isti ili kasniji od fromDate.',
      );
    }

    const requestedDays =
      Math.floor((endDay.getTime() - fromDay.getTime()) / DAY_MS) + 1;
    if (requestedDays > MAX_AVAILABILITY_RANGE_DAYS) {
      throw new BadRequestException(
        `Period dostupnosti ne smije biti duži od ${MAX_AVAILABILITY_RANGE_DAYS} dana.`,
      );
    }
  }
}
