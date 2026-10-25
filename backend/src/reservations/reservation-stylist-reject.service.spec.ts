import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { ReservationStylistRejectService } from './reservation-stylist-reject.service';
import { ReservationSharedService } from './reservation-shared.service';
import { ReservationQueriesService } from './reservation-queries.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../events/events.gateway';
import { SOCKET_EVENTS } from '../events/socket-events';

const reservationDate = new Date('2026-03-20T00:00:00.000Z');
const mockPrisma: any = {
  $queryRaw: jest.fn().mockResolvedValue([{ acquired: true }]),
  $transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
    callback(mockPrisma),
  ),
  stylistProfile: { findUnique: jest.fn() },
  reservation: {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
  reservationStylistResponse: { updateMany: jest.fn() },
};
const mockNotifications = { send: jest.fn() };
const mockEvents = {
  emitToAdmins: jest.fn(),
  emitToAll: jest.fn(),
};
const mockShared = {
  transitionTo: jest.fn((_from: string, to: string) => to),
};
const mockQueries = {
  findOne: jest.fn().mockResolvedValue({
    id: 'res-1',
    serviceId: 'svc-1',
    reservationDate,
  }),
};

const setupCurrentReservation = (current: Record<string, unknown>) => {
  mockPrisma.reservation.findUnique
    .mockResolvedValueOnce({ reservationDate })
    .mockResolvedValueOnce(current);
};

describe('ReservationStylistRejectService', () => {
  let service: ReservationStylistRejectService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.reservation.findUnique.mockReset();
    mockPrisma.reservation.updateMany.mockReset();
    mockPrisma.reservation.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.reservationStylistResponse.updateMany.mockReset();
    mockPrisma.reservationStylistResponse.updateMany.mockResolvedValue({
      count: 1,
    });
    mockPrisma.stylistProfile.findUnique.mockResolvedValue({
      userId: 'user-1',
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationStylistRejectService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: EventsGateway, useValue: mockEvents },
        { provide: ReservationSharedService, useValue: mockShared },
        { provide: ReservationQueriesService, useValue: mockQueries },
      ],
    }).compile();
    service = module.get(ReservationStylistRejectService);
  });

  it('when the last stylist rejects, atomically cancels and notifies the client', async () => {
    setupCurrentReservation({
      id: 'res-1',
      status: 'PENDING',
      serviceId: 'svc-1',
      clientId: 'client-1',
      reservationDate,
      stylistResponses: [
        {
          stylistProfileId: 'sp-1',
          status: 'PENDING',
          lockExpiresAt: null,
        },
      ],
    });
    mockPrisma.reservation.findUnique
      .mockResolvedValueOnce({
        clientId: 'client-1',
        publicReferenceCode: 'RZ-123',
        clientViewToken: 'token-1',
      })
      .mockResolvedValueOnce({
        publicReferenceCode: 'RZ-123',
        reservationDate,
        startTime: '10:00',
        endTime: '11:00',
        attendancePolicy: 'CLIENT_REQUIRED',
        service: { name: 'Šišanje' },
        items: [],
      });

    await service.stylistReject('res-1', 'sp-1', 'user-1', {
      rejectionReason: 'Nemoguće',
    });

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    expect(mockShared.transitionTo).toHaveBeenCalledWith(
      'PENDING',
      'CANCELLED_BY_STYLISTS',
    );
    expect(
      mockPrisma.reservationStylistResponse.updateMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'PENDING' }),
        data: expect.objectContaining({ status: 'REJECTED' }),
      }),
    );
    expect(mockPrisma.reservation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'res-1',
          status: 'PENDING',
        }),
        data: expect.objectContaining({ status: 'CANCELLED_BY_STYLISTS' }),
      }),
    );
    expect(mockNotifications.send).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'client-1',
        type: 'reservation_cancelled',
      }),
    );
    expect(mockEvents.emitToAll).toHaveBeenCalled();
  });

  it('when another stylist is still pending, keeps the reservation open', async () => {
    setupCurrentReservation({
      id: 'res-1',
      status: 'PENDING',
      serviceId: 'svc-1',
      clientId: 'client-1',
      reservationDate,
      stylistResponses: [
        {
          stylistProfileId: 'sp-1',
          status: 'PENDING',
          lockExpiresAt: null,
        },
        {
          stylistProfileId: 'sp-2',
          status: 'PENDING',
          lockExpiresAt: null,
        },
      ],
    });

    await service.stylistReject('res-1', 'sp-1', 'user-1', {
      rejectionReason: 'Zauzet',
    });

    expect(mockPrisma.reservation.updateMany).not.toHaveBeenCalled();
    expect(mockNotifications.send).not.toHaveBeenCalled();
    expect(mockEvents.emitToAll).toHaveBeenCalledWith(
      SOCKET_EVENTS.AVAILABILITY_CHANGED,
      expect.objectContaining({ serviceId: 'svc-1', date: '2026-03-20' }),
    );
  });

  it('rolls back the response change if a concurrent accept already changed the reservation', async () => {
    setupCurrentReservation({
      id: 'res-1',
      status: 'PENDING',
      serviceId: 'svc-1',
      clientId: 'client-1',
      reservationDate,
      stylistResponses: [
        {
          stylistProfileId: 'sp-1',
          status: 'PENDING',
          lockExpiresAt: null,
        },
      ],
    });
    mockPrisma.reservation.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      service.stylistReject('res-1', 'sp-1', 'user-1'),
    ).rejects.toThrow(ConflictException);
  });
});
