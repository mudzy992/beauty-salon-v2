import { ReservationAppointmentReminderService } from './reservation-appointment-reminder.service'
import { ReservationDateService } from './reservation-date.service'
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
    addSalonWallClockHours: jest.fn(),
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
    dates.addSalonWallClockHours.mockImplementation(
      (date: Date, hours: number) =>
        new Date(date.getTime() + hours * 60 * 60 * 1000),
    )
    settings.getNumber.mockResolvedValue(24)
    dates.toDateOnlyString.mockReturnValue('2026-08-15')
    prisma.outboxEvent.createMany.mockResolvedValue({ count: 1 })
    prisma.reservation.updateMany.mockResolvedValue({ count: 1 })
    notifications.send.mockResolvedValue(undefined)
  })

  afterEach(() => jest.useRealTimers())

  it.each([
    {
      name: 'spring-forward',
      now: '2026-03-28T09:00:00.000Z',
      date: '2026-03-29',
      start: '2026-03-29T08:00:00.000Z',
      reminderAt: '2026-03-28T09:00:00.000Z',
      elapsedHours: 23,
    },
    {
      name: 'fall-back',
      now: '2026-10-24T08:00:00.000Z',
      date: '2026-10-25',
      start: '2026-10-25T09:00:00.000Z',
      reminderAt: '2026-10-24T08:00:00.000Z',
      elapsedHours: 25,
    },
  ])(
    'uses salon wall-clock hours for $name reminders',
    async ({
      now,
      date,
      start: expectedStart,
      reminderAt: expectedReminderAt,
      elapsedHours,
    }) => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date(now))
      const reminderSettings = {
        getNumber: jest.fn().mockResolvedValue(24),
        getString: jest.fn().mockResolvedValue('Europe/Sarajevo'),
      }
      const localDates = new ReservationDateService(reminderSettings as never)
      const reservationDate = new Date(`${date}T00:00:00.000Z`)
      const start = localDates.combineDateAndTime(reservationDate, '10:00')
      const reminderAt = localDates.addSalonWallClockHours(start, -24)
      expect(start.toISOString()).toBe(expectedStart)
      expect(reminderAt.toISOString()).toBe(expectedReminderAt)
      expect((start.getTime() - reminderAt.getTime()) / (60 * 60 * 1000)).toBe(
        elapsedHours,
      )

      const reservation = {
        id: 'r-dst',
        clientId: 'c1',
        reservationDate,
        startTime: '10:00',
      }
      prisma.reservation.findMany.mockResolvedValueOnce([reservation])
      prisma.reservation.findUnique.mockResolvedValueOnce({
        ...reservation,
        reminderSentAt: null,
        status: RESERVATION_STATUS.CONFIRMED,
      })
      const reminderService = new ReservationAppointmentReminderService(
        prisma as never,
        reminderSettings as never,
        localDates,
        notifications as never,
      )

      await expect(
        reminderService.processAppointmentReminders(),
      ).resolves.toEqual({
        queuedCount: 1,
      })
      await reminderService.deliverOutboxEvent('event-dst', {
        reservationId: 'r-dst',
        clientId: 'c1',
        reservationDate: date,
        startTime: '10:00',
      })
      expect(notifications.send).toHaveBeenCalledWith(
        expect.objectContaining({ sourceEventId: 'event-dst', userId: 'c1' }),
      )
    },
  )

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
