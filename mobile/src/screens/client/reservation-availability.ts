import type { AvailableDate, TimeSlot } from '../../types';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const TIME_ONLY = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isValidDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_ONLY.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function normalizeAvailableDates(payload: unknown): Record<string, boolean> | null {
  if (!Array.isArray(payload)) return null;

  const dates: AvailableDate[] = [];
  for (const row of payload) {
    if (!isRecord(row) || !isValidDateOnly(row.date) || typeof row.available !== 'boolean') return null;
    dates.push({ date: row.date, available: row.available });
  }

  return Object.fromEntries(dates.map(({ date, available }) => [date, available]));
}

export function normalizeAvailableSlots(payload: unknown): TimeSlot[] | null {
  if (!Array.isArray(payload)) return null;

  const slots: TimeSlot[] = [];
  for (const row of payload) {
    if (
      !isRecord(row) ||
      typeof row.startTime !== 'string' || !TIME_ONLY.test(row.startTime) ||
      typeof row.endTime !== 'string' || !TIME_ONLY.test(row.endTime) ||
      !Number.isInteger(row.availableStylistCount) || (row.availableStylistCount as number) < 0 ||
      (row.holdState !== undefined && row.holdState !== 'none' && row.holdState !== 'pending_hold')
    ) {
      return null;
    }

    const slot: TimeSlot = {
      startTime: row.startTime,
      endTime: row.endTime,
      availableStylistCount: row.availableStylistCount as number,
      holdState: row.holdState as TimeSlot['holdState'],
    };
    // The backend normally omits these; fail closed if a stale/inconsistent response includes one.
    if (slot.availableStylistCount > 0 || slot.holdState === 'pending_hold') slots.push(slot);
  }

  return slots;
}
