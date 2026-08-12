import { BadRequestException } from '@nestjs/common'
import { assertAdminSlotWithinWorkingHours } from './assert-admin-working-hours'

describe('assertAdminSlotWithinWorkingHours', () => {
  const monday = new Date(Date.UTC(2026, 2, 16)) // Mon

  const mockPrisma = {
    salonSettings: { findFirst: jest.fn() },
    holiday: { findFirst: jest.fn() },
    salonWorkingHours: { findUnique: jest.fn() },
    stylistWorkingHours: { findMany: jest.fn() },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockPrisma.salonSettings.findFirst.mockResolvedValue({ id: 'salon-1' })
    mockPrisma.holiday.findFirst.mockResolvedValue(null)
    mockPrisma.salonWorkingHours.findUnique.mockResolvedValue({
      isWorkingDay: true,
      openTime: '09:00',
      closeTime: '17:00',
    })
    mockPrisma.stylistWorkingHours.findMany.mockResolvedValue([
      {
        dayOfWeek: 1,
        dateOverride: null,
        isWorkingDay: true,
        startTime: '10:00',
        endTime: '16:00',
      },
    ])
  })

  it('odbija termin van radnog vremena salona', async () => {
    await expect(
      assertAdminSlotWithinWorkingHours({
        prisma: mockPrisma as any,
        reservationDate: monday,
        startTime: '08:00',
        endTime: '09:00',
        confirmedStylistId: null,
      }),
    ).rejects.toThrow(BadRequestException)
  })

  it('odbija praznik', async () => {
    mockPrisma.holiday.findFirst.mockResolvedValue({ id: 'h1', name: 'Praznik' })
    await expect(
      assertAdminSlotWithinWorkingHours({
        prisma: mockPrisma as any,
        reservationDate: monday,
        startTime: '10:00',
        endTime: '11:00',
        confirmedStylistId: null,
      }),
    ).rejects.toThrow(/praznik/i)
  })

  it('odbija termin van radnog vremena stilista', async () => {
    await expect(
      assertAdminSlotWithinWorkingHours({
        prisma: mockPrisma as any,
        reservationDate: monday,
        startTime: '09:00',
        endTime: '10:30',
        confirmedStylistId: 'sp-1',
      }),
    ).rejects.toThrow(/stilista/i)
  })

  it('prolazi unutar salona i stilista', async () => {
    await expect(
      assertAdminSlotWithinWorkingHours({
        prisma: mockPrisma as any,
        reservationDate: monday,
        startTime: '11:00',
        endTime: '12:00',
        confirmedStylistId: 'sp-1',
      }),
    ).resolves.toBeUndefined()
  })
})
