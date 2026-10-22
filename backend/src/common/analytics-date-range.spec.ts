import {
  analyticsDateBounds,
  resolveAnalyticsDateRange,
} from './analytics-date-range';

describe('analytics date-range validation', () => {
  it('defaults to a bounded rolling twelve-month window', () => {
    expect(
      resolveAnalyticsDateRange(
        undefined,
        undefined,
        new Date('2026-10-22T12:00:00Z'),
      ),
    ).toEqual({ fromDate: '2025-10-22', toDate: '2026-10-22' });
  });

  it('uses the UTC calendar date for defaults regardless of process timezone', () => {
    expect(
      resolveAnalyticsDateRange(
        undefined,
        undefined,
        new Date('2026-10-21T23:30:00-04:00'),
      ),
    ).toEqual({ fromDate: '2025-10-22', toDate: '2026-10-22' });
  });

  it('clamps a leap-day rolling window to the prior month end', () => {
    expect(
      resolveAnalyticsDateRange(
        undefined,
        undefined,
        new Date('2024-02-29T12:00:00Z'),
      ),
    ).toEqual({ fromDate: '2023-02-28', toDate: '2024-02-29' });
  });

  it('validates four-digit years below 0100 without JavaScript Date.UTC remapping', () => {
    expect(resolveAnalyticsDateRange('0001-01-01', '0001-01-02')).toEqual({
      fromDate: '0001-01-01',
      toDate: '0001-01-02',
    });
  });

  it('keeps four-digit years in default date formatting below year 0100', () => {
    expect(
      resolveAnalyticsDateRange(
        undefined,
        undefined,
        new Date('0099-06-15T12:00:00Z'),
      ),
    ).toEqual({ fromDate: '0098-06-15', toDate: '0099-06-15' });
  });

  it('accepts an inclusive range up to sixty calendar months', () => {
    expect(resolveAnalyticsDateRange('2025-01-01', '2030-01-01')).toEqual({
      fromDate: '2025-01-01',
      toDate: '2030-01-01',
    });
  });

  it('uses inclusive UTC calendar-day bounds for database filters', () => {
    expect(
      analyticsDateBounds({ fromDate: '2026-03-01', toDate: '2026-03-31' }),
    ).toEqual({
      gte: new Date('2026-03-01T00:00:00.000Z'),
      lte: new Date('2026-03-31T23:59:59.999Z'),
    });
  });

  it.each([
    ['missing end date', '2026-01-01', undefined],
    ['reversed dates', '2026-02-01', '2026-01-31'],
    ['impossible leap date', '2025-02-29', '2025-03-01'],
    ['range beyond sixty months', '2025-01-01', '2030-01-02'],
    [
      'timestamp instead of a date-only value',
      '2026-01-01T00:00:00Z',
      '2026-01-02',
    ],
  ])('rejects %s', (_label, fromDate, toDate) => {
    expect(() => resolveAnalyticsDateRange(fromDate, toDate)).toThrow();
  });
});
