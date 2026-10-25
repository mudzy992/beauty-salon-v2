export const SALON_TIME_ZONE: 'Europe/Sarajevo';

export interface DateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface DateOnlyParts {
  year: number;
  month: number;
  day: number;
}

export interface DateOnlyRange {
  fromDate: string;
  toDate: string;
}

export function getDateTimePartsInTimeZone(
  value?: Date,
  timeZone?: string,
): DateTimeParts;
export function formatDateOnlyParts(parts: DateOnlyParts): string;
export function getSalonDateOnly(value?: Date, timeZone?: string): string;
export function getSalonTime(value?: Date, timeZone?: string): string;
export function parseDateOnly(value: string): DateOnlyParts;
export function getDateOnlyWeekday(value: string): number;
export function getDaysInMonth(year: number, month: number): number;
export function addDateOnlyDays(value: string, days: number): string;
export function addDateOnlyMonths(value: string, months: number): string;
export function getCurrentMonthRange(value?: Date, timeZone?: string): DateOnlyRange;
export function getCalendarMonthRange(value?: Date, timeZone?: string): DateOnlyRange;
export function getDateOnlyFromLocalCalendarDate(value: Date): string;
export function formatDateOnlyLocale(
  value: string,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string;
export function formatInstantDateLocale(
  value: Date | string,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
  timeZone?: string,
): string;
export function salonWallTimeToInstant(
  dateOnly: string,
  time: string,
  timeZone?: string,
): Date;
