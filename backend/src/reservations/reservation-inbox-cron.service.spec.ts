import { ReservationInboxCronService } from './reservation-inbox-cron.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationDateService } from './reservation-date.service';
import { ReservationSharedService } from './reservation-shared.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../events/events.gateway';
import { SOCKET_EVENTS } from '../events/socket-events';

const reservationDate = new Date('2026-03-20T00:00:00.000Z');
const mockPrisma = {
  reservationStylistResponse: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  reservation: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
    findUnique: jest.fn(),
  },
};
const mockDates = { getInboxTimeoutHours: jest.fn() };
const mockShared = {
  transitionTo: jest.fn((_from: string, to: string) => to),
};
const mockNotifications = { send: jest.fn() };
const mockEvents = { emitToAll: jest.fn() };

describe('ReservationInboxCronService', () => {
  let service: ReservationInboxCronService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.reservationStylistResponse.findMany.mockResolvedValue([]);
    mockPrisma.reservationStylistResponse.updateMany.mockResolvedValue({
      count: 1,
    });
    mockPrisma.reservation.findMany.mockResolvedValue([]);
    mockPrisma.reservation.findUnique.mockResolvedValue({
      id: 'res-1',
      clientId: 'client-1',
      serviceId: 'svc-1',
      reservationDate,
      startTime: '10:00',
      endTime: '11:00',
      service: { name: 'Šišanje' },
    });
    mockPrisma.reservation.updateMany.mockResolvedValue({ count: 1 });
    mockDates.getInboxTimeoutHours.mockResolvedValue(24);
    mockShared.transitionTo.mockImplementation((_from, to) => to);
    service = new ReservationInboxCronService(
      mockPrisma as unknown as PrismaService,
      mockDates as unknown as ReservationDateService,
      mockShared as unknown as ReservationSharedService,
      mockNotifications as unknown as NotificationsService,
      mockEvents as unknown as EventsGateway,
    );
  });

  it('releases an expired lock with a compare-and-set and reports only successful releases', async () => {
    mockPrisma.reservationStylistResponse.findMany.mockResolvedValue([
      {
        id: 'response-1',
        reservationId: 'res-1',
        reservation: {
          status: 'STYLIST_REVIEW',
          serviceId: 'svc-1',
          reservationDate,
          clientId: 'client-1',
        },
      },
    ]);
    mockPrisma.reservationStylistResponse.updateMany.mockResolvedValueOnce({
      count: 0,
    });

    await expect(service.processExpiredLocks()).resolves.toEqual({
      releasedCount: 0,
    });
    const expiredLockCalls = mockPrisma.reservationStylistResponse.updateMany
      .mock.calls as unknown as Array<[unknown]>;
    const updateArgs = expiredLockCalls[0]?.[0] as {
      where: {
        id: string;
        status: string;
        lockExpiresAt: { lte: Date };
      };
    };
    expect(updateArgs.where.id).toBe('response-1');
    expect(updateArgs.where.status).toBe('LOCKED');
    expect(updateArgs.where.lockExpiresAt.lte).toBeInstanceOf(Date);
    expect(mockPrisma.reservation.updateMany).not.toHaveBeenCalled();
    expect(mockEvents.emitToAll).not.toHaveBeenCalled();
  });

  it('conditionally reopens the inbox reservation after a lock expires', async () => {
    mockPrisma.reservationStylistResponse.findMany.mockResolvedValue([
      {
        id: 'response-1',
        reservationId: 'res-1',
        reservation: {
          status: 'STYLIST_REVIEW',
          serviceId: 'svc-1',
          reservationDate,
          clientId: 'client-1',
        },
      },
    ]);

    await expect(service.processExpiredLocks()).resolves.toEqual({
      releasedCount: 1,
    });
    const reservationUpdateCalls = mockPrisma.reservation.updateMany.mock
      .calls as unknown as Array<[unknown]>;
    const updateArgs = reservationUpdateCalls[0]?.[0] as {
      where: { id: string; status: string };
      data: { status: string };
    };
    expect(updateArgs).toEqual({
      where: { id: 'res-1', status: 'STYLIST_REVIEW' },
      data: { status: 'PENDING' },
    });
    expect(mockEvents.emitToAll).toHaveBeenCalledWith(
      SOCKET_EVENTS.AVAILABILITY_CHANGED,
      { serviceId: 'svc-1', date: '2026-03-20' }
    );
  });

  it('does not time out a stale inbox after a concurrent active stylist lock wins', async () => {
    mockPrisma.reservation.findMany.mockResolvedValue([
      {
        id: 'res-1',
        status: 'PENDING',
        clientId: 'client-1',
        serviceId: 'svc-1',
        reservationDate,
        publicReferenceCode: 'RZ-123',
        clientViewToken: 'token-1',
        stylistResponses: [],
      },
    ]);
    mockPrisma.reservation.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(service.processInboxTimeouts()).resolves.toEqual({
      cancelledCount: 0,
    });
    const timeoutUpdateCalls = mockPrisma.reservation.updateMany.mock
      .calls as unknown as Array<[unknown]>;
    const updateArgs = timeoutUpdateCalls[0]?.[0] as {
      where: {
        id: string;
        status: string;
        stylistResponses: {
          none: {
            status: string;
            OR: Array<{ lockExpiresAt: null | { gt: Date } }>;
          };
        };
      };
    };
    expect(updateArgs.where.id).toBe('res-1');
    expect(updateArgs.where.status).toBe('PENDING');
    expect(updateArgs.where.stylistResponses.none.status).toBe('LOCKED');
    expect(updateArgs.where.stylistResponses.none.OR).toHaveLength(2);
    expect(
      updateArgs.where.stylistResponses.none.OR[0].lockExpiresAt,
    ).toBeNull();
    const activeLockExpiry =
      updateArgs.where.stylistResponses.none.OR[1].lockExpiresAt;
    expect(activeLockExpiry).not.toBeNull();
    if (activeLockExpiry === null) {
      throw new Error('Expected the active-lock expiry filter.');
    }
    expect(activeLockExpiry.gt).toBeInstanceOf(Date);
    expect(mockNotifications.send).not.toHaveBeenCalled();
    expect(mockEvents.emitToAll).not.toHaveBeenCalled();
  });
});
