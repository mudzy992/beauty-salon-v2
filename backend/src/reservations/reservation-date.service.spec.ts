import { Test } from '@nestjs/testing'
import { ReservationDateService } from './reservation-date.service'
import { SettingsService } from '../settings/settings.service'

const mockSettingsService = {
  getString: jest.fn(),
}

const createService = async (tz: string): Promise<ReservationDateService> => {
  mockSettingsService.getString.mockResolvedValue(tz)
  const module = await Test.createTestingModule({
    providers: [
      ReservationDateService,
      { provide: SettingsService, useValue: mockSettingsService },
    ],
  }).compile()
  const svc = module.get(ReservationDateService)
  await svc.onModuleInit()
  return svc
}

describe('ReservationDateService', () => {
  afterEach(() => jest.clearAllMocks())

  describe('combineDateAndTime', () => {
    it('Sarajevo CEST: 2026-07-15 10:00 → 08:00Z', async () => {
      const svc = await createService('Europe/Sarajevo')
      const date = new Date('2026-07-15T00:00:00.000Z')
      const result = svc.combineDateAndTime(date, '10:00')
      expect(result.toISOString()).toBe('2026-07-15T08:00:00.000Z')
    })

    it('UTC: 2026-07-15 10:00 → 10:00Z', async () => {
      const svc = await createService('UTC')
      const date = new Date('2026-07-15T00:00:00.000Z')
      const result = svc.combineDateAndTime(date, '10:00')
      expect(result.toISOString()).toBe('2026-07-15T10:00:00.000Z')
    })

    it('handles null/empty time gracefully', async () => {
      const svc = await createService('UTC')
      const date = new Date('2026-07-15T00:00:00.000Z')
      const result = svc.combineDateAndTime(date, '')
      expect(result.toISOString()).toBe('2026-07-15T00:00:00.000Z')
    })
  })

  describe('parseDateOnly', () => {
    it('string YYYY-MM-DD → UTC midnight', async () => {
      const svc = await createService('America/New_York')
      const result = svc.parseDateOnly('2026-01-15')
      expect(result.toISOString()).toBe('2026-01-15T00:00:00.000Z')
    })

    it('Date where UTC day ≠ salon day (America/New_York)', async () => {
      const svc = await createService('America/New_York')
      const utcJan16 = new Date('2026-01-16T02:00:00.000Z')
      const result = svc.parseDateOnly(utcJan16)
      expect(result.toISOString()).toBe('2026-01-15T00:00:00.000Z')
    })

    it('Date in Sarajevo TZ stays same calendar day', async () => {
      const svc = await createService('Europe/Sarajevo')
      const utc = new Date('2026-01-15T23:30:00.000Z')
      const result = svc.parseDateOnly(utc)
      expect(result.toISOString()).toBe('2026-01-16T00:00:00.000Z')
    })
  })

  describe('toLocalDateOnlyString', () => {
    it('formats UTC date in salon TZ', async () => {
      const svc = await createService('Europe/Sarajevo')
      const result = svc.toLocalDateOnlyString(
        new Date('2026-07-15T22:30:00.000Z'),
      )
      expect(result).toBe('2026-07-16')
    })
  })

  describe('getDayStartEnd', () => {
    it('returns UTC boundaries for salon day', async () => {
      const svc = await createService('Europe/Sarajevo')
      const { start, end } = svc.getDayStartEnd(
        new Date('2026-07-15T10:00:00.000Z'),
      )
      expect(start.toISOString()).toBe('2026-07-14T22:00:00.000Z')
      expect(end.toISOString()).toBe('2026-07-15T21:59:59.999Z')
    })
  })

  describe('refreshTimezone', () => {
    it('falls back to default on settings error', async () => {
      mockSettingsService.getString.mockRejectedValue(new Error('fail'))
      const module = await Test.createTestingModule({
        providers: [
          ReservationDateService,
          { provide: SettingsService, useValue: mockSettingsService },
        ],
      }).compile()
      const svc = module.get(ReservationDateService)
      await svc.onModuleInit()
      expect(svc.getTimezone()).toBe('Europe/Sarajevo')
    })
  })
})
