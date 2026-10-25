import { ReservationAppointmentReminderService } from './reservation-appointment-reminder.service'
import { RESERVATION_STATUS } from './constants'

jest.mock('../notifications/utils/load-reservation-push-context', () => ({
  loadReservationPushContext: jest.fn().mockResolvedValue({
    ref: 'ABC123',
    serviceNames: ['Šišanje'],
    endTime: '11:00',
    attendanceRequired: true,
  }),
}))


describe('ReservationAppointmentReminderService', () => {
  const prisma = {
    reservation: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  }
  const settings = { getNumber: jest.fn() }
  const dates = {
    refreshTimezone: jest.fn(),
    combineDateAndTime: jest.fn(),
    toDateOnlyString: jest.fn(),
  }
  const notifications = { send: jest.fn() }

  const service = new ReservationAppointmentReminderService(
    prisma as never,
    settings as never,
    dates as never,
    notifications as never,
  )

  beforeEach(() => {
    jest.clearAllMocks()
    dates.refreshTimezone.mockResolvedValue(undefined)
    settings.getNumber.mockResolvedValue(24)
    dates.toDateOnlyString.mockReturnValue('2026-08-15')
  })

  it('sends once when start is within reminder window', async () => {
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000)
    prisma.reservation.findMany.mockResolvedValueOnce([
      {
        id: 'r1',
        clientId: 'c1',
        reservationDate: new Date('2026-08-15'),
        startTime: '10:00',
      },
    ])
    dates.combineDateAndTime.mockReturnValue(start)
    prisma.reservation.update.mockResolvedValueOnce({})
    notifications.send.mockResolvedValueOnce(undefined)
    const actual = await service.processAppointmentReminders()
    expect(actual.sentCount).toBe(1)
    expect(notifications.send).toHaveBeenCalledTimes(1)
    expect(prisma.reservation.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'r1' } }),
    )
  })

  it('does not send when start is outside window', async () => {
    prisma.reservation.findMany.mockResolvedValueOnce([
      {
        id: 'r1',
        clientId: 'c1',
        reservationDate: new Date('2026-08-20'),
        startTime: '10:00',
        status: RESERVATION_STATUS.CONFIRMED,
      },
    ])
    dates.combineDateAndTime.mockReturnValue(new Date(Date.now() + 72 * 60 * 60 * 1000))
    const actual = await service.processAppointmentReminders()
    expect(actual.sentCount).toBe(0)
    expect(notifications.send).not.toHaveBeenCalled()
  })
})
