import { ReservationOutboxService } from './reservation-outbox.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../events/events.gateway';
import { ReservationQueriesService } from './reservation-queries.service';

describe('ReservationOutboxService', () => {
  const event = {
    id: 'event-1',
    eventType: 'reservation.created',
    attempts: 1,
    payload: {
      reservationId: 'reservation-1',
      actor: {
        sub: 'client-1',
        username: '',
        email: '',
        roles: ['CLIENT'],
      },
      notifyUserIds: ['stylist-user-1'],
      notificationTitle: 'Nova rezervacija',
      notificationBody: 'Nova rezervacija za šišanje.',
      serviceId: 'service-1',
      serviceIds: ['service-1'],
      reservationDate: '2030-01-02',
      emitToAdmins: true,
      emitToStylists: true,
    },
  };
  const prisma = {
    outboxEvent: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUnique: jest.fn().mockResolvedValue(event),
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  };
  const notifications = { sendToMany: jest.fn().mockResolvedValue(undefined) };
  const events = {
    emitToAdmins: jest.fn(),
    emitToStylists: jest.fn(),
    emitToAll: jest.fn(),
  };
  const queries = {
    findOne: jest.fn().mockResolvedValue({ id: 'reservation-1' }),
  };
  let service: ReservationOutboxService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.outboxEvent.updateMany.mockResolvedValue({ count: 1 });
    prisma.outboxEvent.findUnique.mockResolvedValue(event);
    prisma.outboxEvent.findMany.mockResolvedValue([]);
    notifications.sendToMany.mockResolvedValue(undefined);
    queries.findOne.mockResolvedValue({ id: 'reservation-1' });
    service = new ReservationOutboxService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
      events as unknown as EventsGateway,
      queries as unknown as ReservationQueriesService,
    );
  });

  it('isporučuje notifikacije i socket događaje nakon claim-a outbox reda', async () => {
    await service.dispatchAfterCommit('event-1');

    expect(prisma.outboxEvent.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ id: 'event-1', status: 'PENDING' }),
      }),
    );
    expect(notifications.sendToMany).toHaveBeenCalledWith(
      ['stylist-user-1'],
      'Nova rezervacija',
      'Nova rezervacija za šišanje.',
      'reservation_new',
      { reservationId: 'reservation-1', kind: 'reservation_new' },
      'event-1',
    );
    expect(events.emitToAdmins).toHaveBeenCalledWith('reservation:created', {
      id: 'reservation-1',
    });
    expect(events.emitToStylists).toHaveBeenCalledWith('reservation:created', {
      id: 'reservation-1',
    });
    expect(events.emitToAll).toHaveBeenCalledWith('availability:changed', {
      serviceId: 'service-1',
      serviceIds: ['service-1'],
      date: '2030-01-02',
    });
    expect(prisma.outboxEvent.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: 'event-1', status: 'PROCESSING' },
        data: expect.objectContaining({ status: 'DELIVERED' }),
      }),
    );
  });

  it('requeues after an external send succeeds but the delivered marker write fails', async () => {
    prisma.outboxEvent.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockRejectedValueOnce(new Error('database write failed'))
      .mockResolvedValueOnce({ count: 1 });

    await service.dispatchAfterCommit('event-1');

    expect(notifications.sendToMany).toHaveBeenCalledTimes(1);
    expect(events.emitToAdmins).toHaveBeenCalledTimes(1);
    expect(prisma.outboxEvent.updateMany).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        where: { id: 'event-1', status: 'PROCESSING' },
        data: expect.objectContaining({
          status: 'PENDING',
          lastError: 'Delivery failed (Error).',
          lockedAt: null,
        }),
      }),
    );
  });

  it('backs off failed delivery and stores only a sanitized error type', async () => {
    notifications.sendToMany.mockRejectedValueOnce(
      new Error('sensitive SMTP transport detail'),
    );

    await expect(
      service.dispatchAfterCommit('event-1'),
    ).resolves.toBeUndefined();

    expect(prisma.outboxEvent.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: 'event-1', status: 'PROCESSING' },
        data: expect.objectContaining({
          status: 'PENDING',
          nextAttemptAt: expect.any(Date),
          lastError: 'Delivery failed (Error).',
          lockedAt: null,
        }),
      }),
    );
    const requeueCall = prisma.outboxEvent.updateMany.mock.calls[1][0];
    expect(requeueCall.data.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
    expect(requeueCall.data.lastError).not.toContain(
      'sensitive SMTP transport detail',
    );
    expect(events.emitToAdmins).not.toHaveBeenCalled();
  });

  it('moves an event to terminal dead-letter state after the max attempts', async () => {
    prisma.outboxEvent.findUnique.mockResolvedValueOnce({
      ...event,
      attempts: 10,
    });
    notifications.sendToMany.mockRejectedValueOnce(new Error('provider failure'));

    await service.dispatchAfterCommit('event-1');

    expect(prisma.outboxEvent.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: 'event-1', status: 'PROCESSING' },
        data: expect.objectContaining({
          status: 'DEAD_LETTER',
          lastError: 'Delivery failed (Error).',
          lockedAt: null,
        }),
      }),
    );
  });

  it('returns bounded outbox diagnostics and redacts stored error details', async () => {
    const createdAt = new Date('2030-01-01T00:00:00.000Z');
    const updatedAt = new Date('2030-01-01T00:01:00.000Z');
    prisma.outboxEvent.groupBy.mockResolvedValueOnce([
      { status: 'PENDING', _count: { _all: 2 } },
      { status: 'DEAD_LETTER', _count: { _all: 1 } },
    ]);
    prisma.outboxEvent.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(3);
    prisma.outboxEvent.findMany.mockResolvedValueOnce([
      {
        id: 'event-secret-id',
        status: 'DEAD_LETTER',
        attempts: 10,
        nextAttemptAt: createdAt,
        lockedAt: null,
        lastError: 'SMTP failed with password=private-value',
        createdAt,
        updatedAt,
      },
    ]);

    const result = await service.getDiagnostics();

    expect(result.counts).toEqual({ PENDING: 2, DEAD_LETTER: 1 });
    expect(result.duePending).toBe(1);
    expect(result.staleProcessing).toBe(3);
    expect(result.recentEvents).toEqual([
      {
        id: 'event-secret-id',
        status: 'DEAD_LETTER',
        attempts: 10,
        nextAttemptAt: createdAt,
        lockedAt: null,
        lastError: 'Previous error detail redacted.',
        createdAt,
        updatedAt,
      },
    ]);
    expect(prisma.outboxEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
        select: expect.not.objectContaining({ payload: true }),
      }),
    );
  });

  it('recovers expired leases and scans only a bounded retry batch', async () => {
    prisma.outboxEvent.findMany.mockResolvedValueOnce([{ id: 'event-1' }]);
    prisma.outboxEvent.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });

    await service.retryPending();

    expect(prisma.outboxEvent.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          eventType: 'reservation.created',
          status: 'PROCESSING',
          lockedAt: expect.objectContaining({ lt: expect.any(Date) }),
          attempts: { lt: 10 },
        }),
        data: expect.objectContaining({ status: 'PENDING' }),
      }),
    );
    expect(prisma.outboxEvent.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ attempts: { gte: 10 } }),
        data: expect.objectContaining({ status: 'DEAD_LETTER' }),
      }),
    );
    expect(prisma.outboxEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eventType: 'reservation.created',
          status: 'PENDING',
        }),
        take: 25,
        select: { id: true },
      }),
    );
    expect(notifications.sendToMany).toHaveBeenCalledTimes(1);
  });
});
