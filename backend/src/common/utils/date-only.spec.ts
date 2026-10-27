import {
  addDateOnlyDays,
  getDateOnlyDayBounds,
  getDateOnlyRangeBounds,
  getDateOnlyWeekday,
  parseDateOnlyString,
  toDateOnlyString,
  toDateOnlyStringInTimeZone,
  toTimeOnlyStringInTimeZone,
} from './date-only';

describe('date-only utilities', () => {
  it('parses strict calendar dates to UTC midnight independent of process TZ', () => {
    const original = process.env.TZ;
    try {
      process.env.TZ = 'UTC';
      expect(parseDateOnlyString('2026-01-15').toISOString()).toBe(
        '2026-01-15T00:00:00.000Z',
      );
      process.env.TZ = 'Europe/Sarajevo';
      expect(parseDateOnlyString('2026-01-15').toISOString()).toBe(
        '2026-01-15T00:00:00.000Z',
      );
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });

  it.each(['2026-2-03', '2026-02-30', '2026-13-01', '0000-01-01', '2026-01-01T00:00:00Z'])(
    'rejects invalid date-only input %s',
    (value) => {
      expect(() => parseDateOnlyString(value)).toThrow();
    },
  );

  it('serializes database date values with UTC components', () => {
    const original = process.env.TZ;
    try {
      process.env.TZ = 'America/Los_Angeles';
      expect(toDateOnlyString(new Date('2026-01-15T00:00:00.000Z'))).toBe(
        '2026-01-15',
      );
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });

  it('formats instants in the salon timezone around midnight and DST', () => {
    expect(
      toDateOnlyStringInTimeZone(new Date('2026-01-14T23:30:00.000Z')),
    ).toBe('2026-01-15');
    expect(
      toTimeOnlyStringInTimeZone(new Date('2026-03-29T01:30:00.000Z')),
    ).toBe('03:30');
    expect(
      toTimeOnlyStringInTimeZone(new Date('2026-10-25T01:30:00.000Z')),
    ).toBe('02:30');
  });

  it('uses UTC calendar arithmetic and exclusive @db.Date range bounds', () => {
    expect(addDateOnlyDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDateOnlyDays('2024-02-29', 1)).toBe('2024-03-01');
    expect(getDateOnlyWeekday('2026-03-29')).toBe(0);
    expect(getDateOnlyDayBounds('2026-10-25')).toEqual({
      gte: new Date('2026-10-25T00:00:00.000Z'),
      lt: new Date('2026-10-26T00:00:00.000Z'),
    });
    expect(getDateOnlyRangeBounds('2026-02-28', '2026-03-01')).toEqual({
      gte: new Date('2026-02-28T00:00:00.000Z'),
      lt: new Date('2026-03-02T00:00:00.000Z'),
    });
  });
});
