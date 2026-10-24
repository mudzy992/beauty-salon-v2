import { ReservationOutboxService } from './reservation-outbox.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../events/events.gateway';
import { ReservationQueriesService } from './reservation-queries.service';

describe('ReservationOutboxService', () => {
  const event = {
    id: 'event-1',
    eventType: 'reservation.created',
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

  it('ostavlja neuspjeli događaj u durable PENDING stanju i ne baca grešku', async () => {
    notifications.sendToMany.mockRejectedValueOnce(
      new Error('SMTP unavailable'),
    );

    await expect(
      service.dispatchAfterCommit('event-1'),
    ).resolves.toBeUndefined();

    expect(prisma.outboxEvent.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: 'event-1', status: 'PROCESSING' },
        data: expect.objectContaining({
          status: 'PENDING',
          lastError: 'SMTP unavailable',
        }),
      }),
    );
    expect(events.emitToAdmins).not.toHaveBeenCalled();
  });
});
