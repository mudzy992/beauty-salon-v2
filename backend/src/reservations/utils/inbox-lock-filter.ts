import {
  isActiveLock,
  reservationOverlapsInterval,
} from './slot-hold.utils';

type InboxRow = {
  id: string;
  startTime: string;
  endTime: string;
  stylistResponses?: Array<{
    stylistProfileId: string;
    status: string;
    lockExpiresAt: Date | null;
  }>;
};

export function hideOverlappingInboxWhileLocked<T extends InboxRow>(
  items: T[],
  stylistProfileId: string,
  now: Date = new Date(),
): T[] {
  const locked = items.find((r) =>
    (r.stylistResponses ?? []).some(
      (x) => x.stylistProfileId === stylistProfileId && isActiveLock(x, now),
    ),
  );
  if (!locked) return items;
  return items.filter((r) => {
    if (r.id === locked.id) return true;
    return !reservationOverlapsInterval(r, locked.startTime, locked.endTime);
  });
}
