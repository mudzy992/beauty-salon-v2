import { ReservationDelayReminderService } from './reservation-delay-reminder.service';
import { ReservationDateService } from './reservation-date.service';
import { RESERVATION_STATUS } from './constants';

jest.mock('../notifications/utils/load-reservation-push-context', () => ({
  resolvePushContext: jest.fn().mockResolvedValue({
    ref: 'RZ-2',
    serviceNames: ['Šišanje'],
    date: '2026-08-15',
    startTime: '10:30',
    endTime: '11:15',
    attendanceRequired: true,
  }),
}));

describe('ReservationDelayReminderService', () => {
  const tx = {
    reservation: { updateMany: jest.fn() },
    outboxEvent: { createMany: jest.fn() },
  };
  const prisma = {
    salonSettings: { findFirst: jest.fn() },
    reservation: { findMany: jest.fn() },
    $transaction: jest.fn((callback) => callback(tx)),
  };
  const notifications = { send: jest.fn() };
  const dates = {
    toSalonDateOnlyString: jest.fn().mockReturnValue('2026-08-15'),
    toSalonTimeString: jest.fn().mockReturnValue('12:00'),
    combineDateAndTime: jest.fn(),
  };
  const service = new ReservationDelayReminderService(
    prisma as never,
    notifications as never,
    dates as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.salonSettings.findFirst.mockResolvedValue({ pauseBetweenServices: 20 });
    prisma.reservation.findMany.mockImplementation(({ where }) =>
      where.status === RESERVATION_STATUS.IN_PROGRESS
        ? [
            {
              id: 'running-1',
              reservationDate: new Date('2026-08-15T00:00:00.000Z'),
              startTime: '09:00',
              endTime: '11:00',
              confirmedStylistId: 'stylist-1',
              useBreakAfterOverrun: false,
            },
          ]
        : [
            { id: 'first-next', clientId: 'client-first', startTime: '09:30' },
            { id: 'target-1', clientId: 'client-1', startTime: '10:30' },
            { id: 'target-2', clientId: 'client-2', startTime: '11:00' },
          ],
    );
    dates.combineDateAndTime.mockReturnValue(
      new Date(Date.now() - 11 * 60 * 1000),
    );
    tx.reservation.updateMany.mockResolvedValue({ count: 1 });
    tx.outboxEvent.createMany.mockResolvedValue({ count: 2 });
    notifications.send.mockResolvedValue(undefined);
  });

  afterEach(() => jest.useRealTimers());

  it.each([
    {
      name: 'spring-forward',
      now: '2026-03-29T01:10:00.000Z',
      date: '2026-03-29',
      endTime: '01:30',
      pause: 120,
      queuedCount: 0,
    },
    {
      name: 'fall-back',
      now: '2026-10-25T01:30:00.000Z',
      date: '2026-10-25',
      endTime: '01:30',
      pause: 180,
      queuedCount: 2,
    },
  ])(
    'uses elapsed minutes for overrun thresholds across $name',
    async ({ now, date, endTime, pause, queuedCount }) => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(now));
      const localDates = new ReservationDateService({
        getString: jest.fn().mockResolvedValue('Europe/Sarajevo'),
      } as never);
      await localDates.refreshTimezone();
      prisma.salonSettings.findFirst.mockResolvedValue({
        pauseBetweenServices: pause,
      });
      prisma.reservation.findMany.mockImplementation(({ where }) =>
        where.status === RESERVATION_STATUS.IN_PROGRESS
          ? [
              {
                id: 'running-dst',
                reservationDate: new Date(`${date}T00:00:00.000Z`),
                startTime: '00:30',
                endTime,
                confirmedStylistId: 'stylist-1',
                useBreakAfterOverrun: false,
              },
            ]
          : [
              { id: 'first-next', clientId: 'client-first', startTime: '02:00' },
              { id: 'target-1', clientId: 'client-1', startTime: '02:30' },
              { id: 'target-2', clientId: 'client-2', startTime: '03:00' },
            ],
      );
      const dstService = new ReservationDelayReminderService(
        prisma as never,
        notifications as never,
        localDates,
      );

      const result = await dstService.processReservationDelayReminders();

      expect(result).toEqual({ queuedCount });
      expect(tx.reservation.updateMany).toHaveBeenCalledTimes(queuedCount ? 1 : 0);
      expect(tx.outboxEvent.createMany).toHaveBeenCalledTimes(queuedCount ? 1 : 0);
    },
  );

  it('atomically claims an overrun and queues snapshot events for all but the next client', async () => {
    const result = await service.processReservationDelayReminders();

    expect(result).toEqual({ queuedCount: 2 });
    expect(tx.reservation.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'running-1',
        status: RESERVATION_STATUS.IN_PROGRESS,
        delayNotifiedAt: null,
      },
      data: { delayNotifiedAt: expect.any(Date) },
    });
    expect(tx.outboxEvent.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          eventType: 'reservation.delay_warning',
          aggregateId: 'running-1',
          dedupeKey: 'reservation:running-1:delay-warning:target-1',
          payload: expect.objectContaining({
            sourceReservationId: 'running-1',
            reservationId: 'target-1',
            clientId: 'client-1',
            title: expect.any(String),
            body: expect.any(String),
          }),
        }),
        expect.objectContaining({
          dedupeKey: 'reservation:running-1:delay-warning:target-2',
          payload: expect.objectContaining({
            reservationId: 'target-2',
            clientId: 'client-2',
          }),
        }),
      ],
      skipDuplicates: true,
    });
    expect(notifications.send).not.toHaveBeenCalled();
  });

  it('does not enqueue from a second scheduler after the database claim loses', async () => {
    tx.reservation.updateMany.mockResolvedValueOnce({ count: 0 });

    const result = await service.processReservationDelayReminders();

    expect(result).toEqual({ queuedCount: 0 });
    expect(tx.outboxEvent.createMany).not.toHaveBeenCalled();
  });

  it('delivers the immutable recipient/content snapshot with an outbox source ID', async () => {
    const payload = {
      sourceReservationId: 'running-1',
      reservationId: 'target-1',
      clientId: 'client-1',
      title: 'Upozorenje o kašnjenju',
      body: 'Termin kasni.',
    };

    await service.deliverOutboxEvent('event-1', payload);

    expect(notifications.send).toHaveBeenCalledWith({
      userId: 'client-1',
      title: payload.title,
      body: payload.body,
      type: 'reservation_reminder',
      data: { kind: 'delay_warning', reservationId: 'target-1' },
      channel: 'PUSH',
      sourceEventId: 'event-1',
    });
  });
});
