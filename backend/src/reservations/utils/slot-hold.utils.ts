import { intervalsOverlap, timeToMinutes } from './time-slot.utils';
import {
  SLOT_HOLD_INBOX_STATUSES,
  SLOT_OCCUPYING_STATUSES,
  STYLIST_RESPONSE_STATUS,
} from '../constants';

export type SlotHoldResponse = {
  stylistProfileId: string;
  status: string;
  lockExpiresAt: Date | null;
};

export type SlotHoldReservation = {
  startTime: string;
  endTime: string;
  status: string;
  confirmedStylistId: string | null;
  stylistResponses?: SlotHoldResponse[];
};

export function isActiveLock(
  response: SlotHoldResponse,
  now: Date = new Date(),
): boolean {
  if (response.status !== STYLIST_RESPONSE_STATUS.LOCKED) return false;
  if (!response.lockExpiresAt) return true;
  return response.lockExpiresAt.getTime() > now.getTime();
}

export function computeSlotCapacity(input: {
  slotStart: string;
  slotEnd: string;
  stylistIdsInWindow: string[];
  reservations: SlotHoldReservation[];
  now?: Date;
}): { availableStylistCount: number; hasInboxHold: boolean } {
  const now = input.now ?? new Date();
  const slotStart = timeToMinutes(input.slotStart);
  const slotEnd = timeToMinutes(input.slotEnd);
  const eligible = new Set(input.stylistIdsInWindow);
  const busy = new Set<string>();
  let unassignedHolds = 0;
  let hasInboxHold = false;
  for (const r of input.reservations) {
    if (
      !intervalsOverlap(
        slotStart,
        slotEnd,
        timeToMinutes(r.startTime),
        timeToMinutes(r.endTime),
      )
    ) {
      continue;
    }
    if (SLOT_OCCUPYING_STATUSES.includes(r.status as (typeof SLOT_OCCUPYING_STATUSES)[number])) {
      if (r.confirmedStylistId && eligible.has(r.confirmedStylistId)) {
        busy.add(r.confirmedStylistId);
      }
      continue;
    }
    if (
      !SLOT_HOLD_INBOX_STATUSES.includes(
        r.status as (typeof SLOT_HOLD_INBOX_STATUSES)[number],
      )
    ) {
      continue;
    }
    hasInboxHold = true;
    const locker = (r.stylistResponses ?? []).find((x) => isActiveLock(x, now));
    if (locker && eligible.has(locker.stylistProfileId)) {
      busy.add(locker.stylistProfileId);
      continue;
    }
    unassignedHolds += 1;
  }
  const freeCount = [...eligible].filter((id) => !busy.has(id)).length;
  return {
    availableStylistCount: Math.max(0, freeCount - unassignedHolds),
    hasInboxHold,
  };
}

export function reservationOverlapsInterval(
  reservation: { startTime: string; endTime: string },
  startTime: string,
  endTime: string,
): boolean {
  return intervalsOverlap(
    timeToMinutes(startTime),
    timeToMinutes(endTime),
    timeToMinutes(reservation.startTime),
    timeToMinutes(reservation.endTime),
  );
}

