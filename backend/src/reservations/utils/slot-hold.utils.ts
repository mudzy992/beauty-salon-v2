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
  response: Pick<SlotHoldResponse, 'status' | 'lockExpiresAt'>,
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
  const overlapping = input.reservations.filter((reservation) =>
    intervalsOverlap(
      slotStart,
      slotEnd,
      timeToMinutes(reservation.startTime),
      timeToMinutes(reservation.endTime),
    ),
  );

  // Confirmed work consumes a stylist before inbox locks are assigned. This
  // makes the result independent of the database row order.
  for (const reservation of overlapping) {
    if (
      SLOT_OCCUPYING_STATUSES.includes(
        reservation.status as (typeof SLOT_OCCUPYING_STATUSES)[number],
      ) &&
      reservation.confirmedStylistId &&
      eligible.has(reservation.confirmedStylistId)
    ) {
      busy.add(reservation.confirmedStylistId);
    }
  }

  for (const reservation of overlapping) {
    if (
      !SLOT_HOLD_INBOX_STATUSES.includes(
        reservation.status as (typeof SLOT_HOLD_INBOX_STATUSES)[number],
      )
    ) {
      continue;
    }
    hasInboxHold = true;
    const locker = (reservation.stylistResponses ?? []).find((response) =>
      isActiveLock(response, now),
    );
    if (
      locker &&
      eligible.has(locker.stylistProfileId) &&
      !busy.has(locker.stylistProfileId)
    ) {
      busy.add(locker.stylistProfileId);
      continue;
    }
    // A lock on an already-busy stylist cannot consume the same capacity
    // twice; the hold still reserves one unit from the remaining stylists.
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
