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
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    outboxEvent: { createMany: jest.fn() },
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
    prisma.outboxEvent.createMany.mockResolvedValue({ count: 1 })
    prisma.reservation.updateMany.mockResolvedValue({ count: 1 })
    notifications.send.mockResolvedValue(undefined)
  })

  it('queues a reminder event with a stable per-schedule dedupe key', async () => {
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

    const actual = await service.processAppointmentReminders()

    expect(actual).toEqual({ queuedCount: 1 })
    expect(notifications.send).not.toHaveBeenCalled()
    expect(prisma.outboxEvent.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          eventType: 'reservation.appointment_reminder',
          aggregateId: 'r1',
          dedupeKey: 'reservation:r1:appointment-reminder:2026-08-15:10:00',
          payload: {
            reservationId: 'r1',
            clientId: 'c1',
            reservationDate: '2026-08-15',
            startTime: '10:00',
          },
        }),
      ],
      skipDuplicates: true,
    })
  })

  it('does not queue when the appointment is outside the reminder window', async () => {
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

    expect(actual).toEqual({ queuedCount: 0 })
    expect(prisma.outboxEvent.createMany).not.toHaveBeenCalled()
    expect(notifications.send).not.toHaveBeenCalled()
  })

  it('revalidates the scheduled reservation before delivering and records the outbox source', async () => {
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000)
    prisma.reservation.findUnique.mockResolvedValueOnce({
      id: 'r1',
      clientId: 'c1',
      reservationDate: new Date('2026-08-15'),
      startTime: '10:00',
      reminderSentAt: null,
      status: RESERVATION_STATUS.CONFIRMED,
    })
    dates.combineDateAndTime.mockReturnValue(start)

    await service.deliverOutboxEvent('event-1', {
      reservationId: 'r1',
      clientId: 'c1',
      reservationDate: '2026-08-15',
      startTime: '10:00',
    })

    expect(notifications.send).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'c1',
        type: 'reservation_reminder',
        channel: 'BOTH',
        sourceEventId: 'event-1',
      }),
    )
    expect(prisma.reservation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'r1', reminderSentAt: null }),
        data: { reminderSentAt: expect.any(Date) },
      }),
    )
  })

  it('suppresses an outbox reminder when the reservation is no longer eligible', async () => {
    prisma.reservation.findUnique.mockResolvedValueOnce({
      id: 'r1',
      clientId: 'c1',
      reservationDate: new Date('2026-08-15'),
      startTime: '10:00',
      reminderSentAt: null,
      status: RESERVATION_STATUS.CANCELLED_BY_CLIENT,
    })

    await service.deliverOutboxEvent('event-1', {
      reservationId: 'r1',
      clientId: 'c1',
      reservationDate: '2026-08-15',
      startTime: '10:00',
    })

    expect(notifications.send).not.toHaveBeenCalled()
    expect(prisma.reservation.updateMany).not.toHaveBeenCalled()
  })
})
