import { zonedWallTimeToUtc, getZonedDateParts } from './zoned-time'

describe('zonedWallTimeToUtc', () => {
  it('converts Sarajevo CEST wall time to UTC (UTC+2)', () => {
    const result = zonedWallTimeToUtc(2026, 6, 15, 10, 0, 'Europe/Sarajevo')
    expect(result.toISOString()).toBe('2026-07-15T08:00:00.000Z')
  })

  it('converts Sarajevo CET wall time to UTC (UTC+1)', () => {
    const result = zonedWallTimeToUtc(2026, 0, 15, 10, 0, 'Europe/Sarajevo')
    expect(result.toISOString()).toBe('2026-01-15T09:00:00.000Z')
  })

  it('converts UTC wall time without offset', () => {
    const result = zonedWallTimeToUtc(2026, 6, 15, 10, 0, 'UTC')
    expect(result.toISOString()).toBe('2026-07-15T10:00:00.000Z')
  })

  it('handles America/New_York (UTC-5 EST)', () => {
    const result = zonedWallTimeToUtc(2026, 0, 15, 21, 30, 'America/New_York')
    expect(result.toISOString()).toBe('2026-01-16T02:30:00.000Z')
  })
})

describe('getZonedDateParts', () => {
  it('returns Sarajevo CEST parts from UTC date', () => {
    const utc = new Date('2026-07-15T08:00:00.000Z')
    const parts = getZonedDateParts(utc, 'Europe/Sarajevo')
    expect(parts).toEqual({ year: 2026, month: 7, day: 15, hour: 10, minute: 0 })
  })

  it('returns America/New_York parts where UTC day differs', () => {
    const utc = new Date('2026-01-16T02:00:00.000Z')
    const parts = getZonedDateParts(utc, 'America/New_York')
    expect(parts).toEqual({ year: 2026, month: 1, day: 15, hour: 21, minute: 0 })
  })

  it('handles midnight correctly', () => {
    const utc = new Date('2026-07-15T22:00:00.000Z')
    const parts = getZonedDateParts(utc, 'Europe/Sarajevo')
    expect(parts).toEqual({ year: 2026, month: 7, day: 16, hour: 0, minute: 0 })
  })
})
