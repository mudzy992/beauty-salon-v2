import { BadRequestException } from '@nestjs/common'
import { assertClientDayBookingAllowed } from './assert-client-day-booking'

const day = '2026-08-20'
const cut = {
  status: 'CONFIRMED',
  startTime: '10:00',
  endTime: '11:00',
  serviceId: 'svc-cut',
  items: [
    {
      serviceId: 'svc-cut',
      service: { name: 'Šišanje' },
    },
  ],
}
const color = {
  status: 'CONFIRMED',
  startTime: '13:00',
  endTime: '14:30',
  serviceId: 'svc-color',
  items: [
    {
      serviceId: 'svc-color',
      service: { name: 'Farbanje' },
    },
  ],
}

describe('assertClientDayBookingAllowed', () => {
  const mockPrisma = {
    reservation: { findMany: jest.fn() },
  }

  const run = (opts: {
    startTime: string
    endTime: string
    serviceIds: string[]
    excludeReservationId?: string
  }) =>
    assertClientDayBookingAllowed({
      prisma: mockPrisma as any,
      clientId: 'client-1',
      reservationDate: day,
      startTime: opts.startTime,
      endTime: opts.endTime,
      serviceIds: opts.serviceIds,
      excludeReservationId: opts.excludeReservationId,
    })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('dozvoljava drugi servis bez preklapanja', async () => {
    mockPrisma.reservation.findMany.mockResolvedValue([cut])
    await expect(
      run({
        startTime: '13:00',
        endTime: '14:30',
        serviceIds: ['svc-color'],
      }),
    ).resolves.toBeUndefined()
  })

  it('blokira preklapanje vremena', async () => {
    mockPrisma.reservation.findMany.mockResolvedValue([cut])
    await expect(
      run({
        startTime: '10:30',
        endTime: '11:30',
        serviceIds: ['svc-color'],
      }),
    ).rejects.toThrow(/tom periodu \(10:00–11:00\)/)
  })

  it('blokira isti serviceId isti dan uključujući COMPLETED', async () => {
    mockPrisma.reservation.findMany.mockResolvedValue([
      { ...cut, status: 'COMPLETED' },
    ])
    await expect(
      run({
        startTime: '16:00',
        endTime: '17:00',
        serviceIds: ['svc-cut'],
      }),
    ).rejects.toThrow(/Šišanje/)
  })

  it('ne blokira cancel / NO_SHOW (nisu u query rezultatu)', async () => {
    mockPrisma.reservation.findMany.mockResolvedValue([])
    await expect(
      run({
        startTime: '10:00',
        endTime: '11:00',
        serviceIds: ['svc-cut'],
      }),
    ).resolves.toBeUndefined()
  })

  it('excludeReservationId ide u where (self se ignorira)', async () => {
    mockPrisma.reservation.findMany.mockResolvedValue([])
    await run({
      startTime: '10:00',
      endTime: '11:00',
      serviceIds: ['svc-cut'],
      excludeReservationId: 'res-self',
    })
    expect(mockPrisma.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: 'res-self' },
        }),
      }),
    )
  })

  it('blokira presjek servisa u multi-item rezervaciji', async () => {
    mockPrisma.reservation.findMany.mockResolvedValue([
      {
        ...cut,
        items: [
          { serviceId: 'svc-cut', service: { name: 'Šišanje' } },
          { serviceId: 'svc-blow', service: { name: 'Feniranje' } },
        ],
      },
    ])
    await expect(
      run({
        startTime: '13:00',
        endTime: '14:00',
        serviceIds: ['svc-cut', 'svc-color'],
      }),
    ).rejects.toThrow(BadRequestException)
    await expect(
      run({
        startTime: '13:00',
        endTime: '14:00',
        serviceIds: ['svc-cut', 'svc-color'],
      }),
    ).rejects.toThrow(/Šišanje/)
  })

  it('dozvoljava farbanje poslije šišanja', async () => {
    mockPrisma.reservation.findMany.mockResolvedValue([cut, color])
    await expect(
      run({
        startTime: '15:00',
        endTime: '16:00',
        serviceIds: ['svc-nails'],
      }),
    ).resolves.toBeUndefined()
  })
})
