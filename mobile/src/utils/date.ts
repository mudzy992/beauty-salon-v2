import {
  addDateOnlyDays,
  addDateOnlyMonths,
  formatDateOnlyLocale,
  formatInstantDateLocale,
  getCalendarMonthRange,
  getDateOnlyWeekday,
  getDateTimePartsInTimeZone,
  getSalonDateOnly,
  getSalonTime,
  salonWallTimeToInstant,
} from '../../../shared/business-date.mjs';

export {
  addDateOnlyDays,
  addDateOnlyMonths,
  formatDateOnlyLocale,
  formatInstantDateLocale,
  getCalendarMonthRange,
  getDateOnlyWeekday,
  getDateTimePartsInTimeZone,
  getSalonDateOnly,
  getSalonTime,
  salonWallTimeToInstant,
};

export function formatDate(dateStr: string): string {
  return formatDateOnlyLocale(dateStr.slice(0, 10), 'bs-BA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatTime(timeStr: string): string {
  if (timeStr.length === 5) return timeStr;
  return timeStr.slice(0, 5);
}

export function formatDateTime(dateStr: string): string {
  return formatInstantDateLocale(dateStr, 'bs-BA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateLong(dateStr: string): string {
  return formatDateOnlyLocale(dateStr.slice(0, 10), 'bs-BA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function isUpcoming(dateStr: string, endTime?: string): boolean {
  const dateOnly = dateStr.slice(0, 10);
  if (!endTime) return dateOnly >= getSalonDateOnly();
  try {
    return salonWallTimeToInstant(dateOnly, endTime).getTime() >= Date.now();
  } catch {
    return dateOnly >= getSalonDateOnly();
  }
}

export function isPast(dateStr: string): boolean {
  return dateStr.slice(0, 10) < getSalonDateOnly();
}

export function getDateRange(days = 30): { fromDate: string; toDate: string } {
  const fromDate = getSalonDateOnly();
  return {
    fromDate,
    toDate: addDateOnlyDays(fromDate, days),
  };
}

export const getSalonMonthLabel = (value = new Date()): string => {
  const dateOnly = getSalonDateOnly(value);
  return formatDateOnlyLocale(dateOnly, 'bs-BA', {
    month: 'long',
    year: 'numeric',
  });
};
