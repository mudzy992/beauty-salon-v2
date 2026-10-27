import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  AnalyticsDashboardQueryDto,
  toAnalyticsDashboardParams,
} from './analytics-dashboard-query.dto';

describe('AnalyticsDashboardQueryDto', () => {
  it('transforms valid calendar and rolling-range query values', async () => {
    const query = plainToInstance(AnalyticsDashboardQueryDto, {
      year: '2026',
      month: '10',
    });

    expect(query.year).toBe(2026);
    expect(query.month).toBe(10);
    expect(await validate(query)).toHaveLength(0);
    expect(toAnalyticsDashboardParams(query)).toEqual({
      year: 2026,
      month: 10,
    });
  });

  it('accepts a strict date-only custom range', async () => {
    const query = plainToInstance(AnalyticsDashboardQueryDto, {
      fromDate: '2026-01-01',
      toDate: '2026-12-31',
    });

    expect(await validate(query)).toHaveLength(0);
    expect(toAnalyticsDashboardParams(query)).toEqual({
      fromDate: '2026-01-01',
      toDate: '2026-12-31',
    });
  });

  it('rejects fractional, malformed and over-cap numeric inputs', async () => {
    const invalidQueries = [
      { year: '2026.5', month: '1' },
      { year: '2026', month: '13' },
      { monthsBack: '0' },
      { monthsBack: '61' },
      { monthsBack: 'not-a-number' },
      { fromDate: '2026-1-01', toDate: '2026-12-31' },
    ];

    for (const values of invalidQueries) {
      const query = plainToInstance(AnalyticsDashboardQueryDto, values);
      expect(await validate(query)).not.toHaveLength(0);
    }
  });

  it('rejects partial or mixed date-range modes', () => {
    const partial = plainToInstance(AnalyticsDashboardQueryDto, {
      fromDate: '2026-01-01',
    });
    const mixed = plainToInstance(AnalyticsDashboardQueryDto, {
      year: '2026',
      month: '10',
      monthsBack: '12',
    });

    expect(() => toAnalyticsDashboardParams(partial)).toThrow(
      'Nedostaje dio analytics date range parametara.',
    );
    expect(() => toAnalyticsDashboardParams(mixed)).toThrow(
      'Koristite samo jedan analytics date range format po zahtjevu.',
    );
  });

  it('rejects incomplete year-month and paired date modes', () => {
    const partialMonth = plainToInstance(AnalyticsDashboardQueryDto, {
      year: '2026',
    });
    const mixedDate = plainToInstance(AnalyticsDashboardQueryDto, {
      fromDate: '2026-01-01',
      toDate: '2026-12-31',
      monthsBack: '12',
    });

    expect(() => toAnalyticsDashboardParams(partialMonth)).toThrow(
      'Nedostaje dio analytics date range parametara.',
    );
    expect(() => toAnalyticsDashboardParams(mixedDate)).toThrow(
      'Koristite samo jedan analytics date range format po zahtjevu.',
    );
  });
});
