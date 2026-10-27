import {
  getBookPeriodDateBounds,
  getCurrentPeriod,
  getPeriodOfDate,
} from './book-period';

describe('book-period date semantics', () => {
  it('uses salon-local calendar month at midnight, independent of process TZ', () => {
    const salonMidnightAtMonthBoundary = new Date('2026-03-31T22:05:00.000Z');
    const original = process.env.TZ;

    try {
      process.env.TZ = 'UTC';
      expect(getCurrentPeriod(salonMidnightAtMonthBoundary)).toEqual({
        year: 2026,
        month: 4,
      });

      process.env.TZ = 'Europe/Sarajevo';
      expect(getCurrentPeriod(salonMidnightAtMonthBoundary)).toEqual({
        year: 2026,
        month: 4,
      });
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });

  it('derives a financial period from UTC calendar components of @db.Date', () => {
    expect(getPeriodOfDate(new Date('2026-03-31T00:00:00.000Z'))).toEqual({
      year: 2026,
      month: 3,
    });
  });

  it('uses an exclusive next-month bound for date-only book queries', () => {
    expect(getBookPeriodDateBounds(2026, 3)).toEqual({
      gte: new Date('2026-03-01T00:00:00.000Z'),
      lt: new Date('2026-04-01T00:00:00.000Z'),
    });
  });
});
