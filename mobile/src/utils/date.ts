import { format, parseISO, isAfter, isBefore, isToday, addDays } from 'date-fns';

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'dd.MM.yyyy');
}

export function formatTime(timeStr: string): string {
  if (timeStr.length === 5) return timeStr;
  return timeStr.slice(0, 5);
}

export function formatDateTime(dateStr: string): string {
  return format(parseISO(dateStr), 'dd.MM.yyyy HH:mm');
}

export function formatDateLong(dateStr: string): string {
  return format(parseISO(dateStr), 'dd. MMMM yyyy');
}

export function isUpcoming(dateStr: string): boolean {
  const date = parseISO(dateStr);
  return isAfter(date, new Date()) || isToday(date);
}

export function isPast(dateStr: string): boolean {
  const date = parseISO(dateStr);
  return isBefore(date, new Date()) && !isToday(date);
}

export function getDateRange(days: number = 30): { fromDate: string; toDate: string } {
  const from = new Date();
  const to = addDays(from, days);
  return {
    fromDate: format(from, 'yyyy-MM-dd'),
    toDate: format(to, 'yyyy-MM-dd'),
  };
}
