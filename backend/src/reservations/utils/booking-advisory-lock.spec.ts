import {
  acquireReservationDayLocks,
  reservationDayKey,
} from './booking-advisory-lock';

describe('reservation day advisory locks', () => {
  it('normalizes, deduplicates and acquires multiple dates in stable order', async () => {
    const db = {
      $queryRaw: jest.fn().mockResolvedValue([{ acquired: true }]),
    };

    await acquireReservationDayLocks(db, [
      '2026-08-21',
      new Date('2026-08-20T00:00:00.000Z'),
      '2026-08-21',
    ]);

    expect(db.$queryRaw).toHaveBeenCalledTimes(2);
    const lockKeys = db.$queryRaw.mock.calls.map(([query]) => {
      const sqlQuery = query as { values: unknown[] };
      return sqlQuery.values[0] as string;
    });
    expect(lockKeys).toEqual([
      'reservation-day:2026-08-20',
      'reservation-day:2026-08-21',
    ]);
  });

  it('rejects malformed or impossible date-only keys', () => {
    expect(() => reservationDayKey('2026-02-30')).toThrow(
      'Neispravan datum za reservation lock.',
    );
    expect(() => reservationDayKey('2026-08-20T00:00:00.000Z')).toThrow(
      'Neispravan datum za reservation lock.',
    );
  });
});
