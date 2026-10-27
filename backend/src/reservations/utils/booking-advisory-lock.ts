import { Prisma } from '@prisma/client';
import {
  parseDateOnlyString,
  toDateOnlyString,
} from '../../common/utils/date-only';

export type BookingLockClient = Pick<Prisma.TransactionClient, '$queryRaw'>;

export const reservationDayKey = (value: Date | string): string => {
  try {
    if (typeof value === 'string') {
      parseDateOnlyString(value);
      return value;
    }
    return toDateOnlyString(value);
  } catch {
    throw new Error('Neispravan datum za reservation lock.');
  }
};

const acquireLock = async (
  db: BookingLockClient,
  key: string,
): Promise<void> => {
  // Prisma cannot deserialize PostgreSQL's `void` result. The function is
  // volatile, so testing its result for NULL still executes the transaction
  // lock while returning a supported boolean scalar to `$queryRaw`.
  await db.$queryRaw<Array<{ acquired: boolean }>>(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0)) IS NULL AS acquired`,
  );
};

/**
 * Coarse but collision-safe booking guard: serialize reservation capacity
 * decisions for one salon calendar date while preserving multi-stylist
 * capacity. The lock is released automatically when the surrounding
 * PostgreSQL transaction commits or rolls back.
 */
export const acquireReservationDayLock = async (
  db: BookingLockClient,
  date: Date | string,
): Promise<void> => {
  await acquireLock(db, `reservation-day:${reservationDayKey(date)}`);
};

/** Acquire multiple calendar-day locks in a stable order to avoid deadlocks. */
export const acquireReservationDayLocks = async (
  db: BookingLockClient,
  dates: Array<Date | string>,
): Promise<void> => {
  const dayKeys = [...new Set(dates.map(reservationDayKey))].sort();
  for (const dayKey of dayKeys) {
    await acquireLock(db, `reservation-day:${dayKey}`);
  }
};

/** Serialize replays using the same client-scoped idempotency key. */
export const acquireReservationIdempotencyLock = async (
  db: BookingLockClient,
  clientId: string,
  idempotencyKey: string,
): Promise<void> => {
  await acquireLock(
    db,
    `reservation-idempotency:${clientId}:${idempotencyKey}`,
  );
};
