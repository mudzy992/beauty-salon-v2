import {
  DEFAULT_SALON_TIMEZONE,
  getZonedDateParts,
} from './zoned-time';

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface DateOnlyParts {
  year: number;
  month: number;
  day: number;
}

export interface DateOnlyBounds {
  gte: Date;
  lt: Date;
}

const makeUtcDate = (
  year: number,
  monthIndex: number,
  day: number,
): Date => {
  const date = new Date(0);
  date.setUTCFullYear(year, monthIndex, day);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const assertValidDate = (date: Date, year: number, month: number, day: number) => {
  if (
    year < 1 ||
    year > 9999 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new RangeError('Invalid calendar date.');
  }
};

/** Parse a strict YYYY-MM-DD date-only value to UTC midnight for @db.Date. */
export const parseDateOnlyString = (value: string): Date => {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) {
    throw new RangeError('Invalid date-only format. Expected YYYY-MM-DD.');
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = makeUtcDate(year, month - 1, day);
  assertValidDate(date, year, month, day);
  return date;
};

/** Format a Prisma @db.Date Date using its canonical UTC calendar components. */
export const toDateOnlyString = (date: Date): string => {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
    throw new TypeError('Expected a valid Date.');
  }
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/** Format an instant as a salon calendar date, independent of process TZ. */
export const toDateOnlyStringInTimeZone = (
  date: Date,
  timeZone = DEFAULT_SALON_TIMEZONE,
): string => {
  const parts = getZonedDateParts(date, timeZone);
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
};

/** Return an instant's salon wall-clock time as HH:mm. */
export const toTimeOnlyStringInTimeZone = (
  date: Date,
  timeZone = DEFAULT_SALON_TIMEZONE,
): string => {
  const parts = getZonedDateParts(date, timeZone);
  return `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
};

export const getDateOnlyWeekday = (value: string): number =>
  parseDateOnlyString(value).getUTCDay();

export const addDateOnlyDays = (value: string, days: number): string => {
  if (!Number.isInteger(days)) throw new RangeError('days must be an integer.');
  const date = parseDateOnlyString(value);
  date.setUTCDate(date.getUTCDate() + days);
  const year = date.getUTCFullYear();
  if (year < 1 || year > 9999) {
    throw new RangeError('Resulting date is outside the supported range.');
  }
  return toDateOnlyString(date);
};

/** Inclusive date-only range bounds for Prisma @db.Date: [from, day-after-to). */
export const getDateOnlyRangeBounds = (
  fromDate: string,
  toDate: string,
): DateOnlyBounds => {
  const start = parseDateOnlyString(fromDate);
  const end = parseDateOnlyString(toDate);
  if (start.getTime() > end.getTime()) {
    throw new RangeError('fromDate must not be after toDate.');
  }
  end.setUTCDate(end.getUTCDate() + 1);
  if (end.getUTCFullYear() > 9999) {
    throw new RangeError('Resulting date is outside the supported range.');
  }
  return { gte: start, lt: end };
};

export const getDateOnlyDayBounds = (date: string): DateOnlyBounds =>
  getDateOnlyRangeBounds(date, date);
