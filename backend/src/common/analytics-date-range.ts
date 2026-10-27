import { BadRequestException } from '@nestjs/common';
import {
  addDateOnlyDays,
  getDateOnlyRangeBounds,
  parseDateOnlyString,
  toDateOnlyStringInTimeZone,
} from './utils/date-only';
import {
  DEFAULT_SALON_TIMEZONE,
  zonedWallTimeToUtc,
} from './utils/zoned-time';

export const DEFAULT_ANALYTICS_MONTHS_BACK = 12;
export const MAX_ANALYTICS_RANGE_MONTHS = 60;

export interface ResolvedAnalyticsDateRange {
  fromDate: string;
  toDate: string;
}

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const makeUtcDate = (year: number, month: number, day: number): Date => {
  const date = new Date(0);
  date.setUTCFullYear(year, month, day);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const parseDateOnly = (value: string, fieldName: string): Date => {
  if (!DATE_ONLY_PATTERN.test(value)) {
    throw new BadRequestException(
      `${fieldName} mora biti datum u formatu YYYY-MM-DD.`,
    );
  }
  try {
    return parseDateOnlyString(value);
  } catch {
    throw new BadRequestException(
      `${fieldName} nije važeći kalendarski datum.`,
    );
  }
};

const addMonthsClamped = (date: Date, months: number): Date => {
  const monthIndex = date.getUTCMonth() + months;
  const year = date.getUTCFullYear() + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = makeUtcDate(year, month + 1, 0).getUTCDate();
  return makeUtcDate(
    year,
    month,
    Math.min(date.getUTCDate(), lastDayOfTargetMonth),
  );
};

const formatDateOnly = (date: Date): string =>
  `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
    date.getUTCDate(),
  ).padStart(2, '0')}`;

export const resolveAnalyticsDateRange = (
  fromDate?: string,
  toDate?: string,
  now = new Date(),
): ResolvedAnalyticsDateRange => {
  if (fromDate == null && toDate == null) {
    const end = parseDateOnly(
      toDateOnlyStringInTimeZone(now, DEFAULT_SALON_TIMEZONE),
      'toDate',
    );
    const start = addMonthsClamped(end, -DEFAULT_ANALYTICS_MONTHS_BACK);
    return { fromDate: formatDateOnly(start), toDate: formatDateOnly(end) };
  }

  if (fromDate == null || toDate == null) {
    throw new BadRequestException(
      'fromDate i toDate moraju biti navedeni zajedno.',
    );
  }

  const start = parseDateOnly(fromDate, 'fromDate');
  const end = parseDateOnly(toDate, 'toDate');
  if (start > end) {
    throw new BadRequestException('fromDate ne može biti poslije toDate.');
  }
  if (end > addMonthsClamped(start, MAX_ANALYTICS_RANGE_MONTHS)) {
    throw new BadRequestException(
      `Analytics date range ne može biti duži od ${MAX_ANALYTICS_RANGE_MONTHS} mjeseci.`,
    );
  }

  return { fromDate, toDate };
};

/** UTC date-only bounds for Prisma @db.Date fields: [from, day-after-to). */
export const analyticsDateBounds = (
  range: ResolvedAnalyticsDateRange,
) => getDateOnlyRangeBounds(range.fromDate, range.toDate)

/** Salon-local calendar range converted to instant bounds for timestamp fields. */
export const analyticsInstantBounds = (
  range: ResolvedAnalyticsDateRange,
  timeZone = DEFAULT_SALON_TIMEZONE,
) => {
  const start = parseDateOnlyString(range.fromDate)
  const afterEnd = parseDateOnlyString(addDateOnlyDays(range.toDate, 1))
  return {
    gte: zonedWallTimeToUtc(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate(),
      0,
      0,
      timeZone,
    ),
    lt: zonedWallTimeToUtc(
      afterEnd.getUTCFullYear(),
      afterEnd.getUTCMonth(),
      afterEnd.getUTCDate(),
      0,
      0,
      timeZone,
    ),
  }
}
