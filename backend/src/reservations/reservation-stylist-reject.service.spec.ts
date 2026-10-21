import { Test, TestingModule } from '@nestjs/testing';
import { ReservationStylistRejectService } from './reservation-stylist-reject.service';
import { ReservationSharedService } from './reservation-shared.service';
import { ReservationQueriesService } from './reservation-queries.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../events/events.gateway';
import { SOCKET_EVENTS } from '../events/socket-events';

const mockPrisma: any = {
  stylistProfile: { findUnique: jest.fn() },
  reservation: { findUnique: jest.fn(), update: jest.fn() },
  reservationStylistResponse: { update: jest.fn() },
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
    reservationDate: new Date('2026-03-20'),
  }),
};

describe('ReservationStylistRejectService', () => {
  let service: ReservationStylistRejectService;

  beforeEach(async () => {
    jest.clearAllMocks();
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

  it('when last stylist rejects → CANCELLED_BY_STYLISTS + notification', async () => {
    mockPrisma.stylistProfile.findUnique.mockResolvedValue({
      userId: 'user-1',
    });
    mockPrisma.reservation.findUnique
      .mockResolvedValueOnce({
        id: 'res-1',
        status: 'PENDING',
        serviceId: 'svc-1',
        reservationDate: new Date('2026-03-20'),
        stylistResponses: [
          {
            stylistProfileId: 'sp-1',
            status: 'PENDING',
            lockExpiresAt: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        clientId: 'client-1',
        publicReferenceCode: 'RZ-123',
        clientViewToken: 'token-1',
      });

    await service.stylistReject('res-1', 'sp-1', 'user-1', {
      rejectionReason: 'Nemoguće',
    });

    expect(mockShared.transitionTo).toHaveBeenCalledWith(
      'PENDING',
      'CANCELLED_BY_STYLISTS',
    );
    expect(mockPrisma.reservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'CANCELLED_BY_STYLISTS',
        }),
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

  it('when other stylists still PENDING → does NOT cancel reservation', async () => {
    mockPrisma.stylistProfile.findUnique.mockResolvedValue({
      userId: 'user-1',
    });
    mockPrisma.reservation.findUnique.mockResolvedValue({
      id: 'res-1',
      status: 'PENDING',
      serviceId: 'svc-1',
      reservationDate: new Date('2026-03-20'),
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

    expect(mockPrisma.reservation.update).not.toHaveBeenCalled();
    expect(mockNotifications.send).not.toHaveBeenCalled();
    expect(mockEvents.emitToAll).toHaveBeenCalledWith(
      SOCKET_EVENTS.AVAILABILITY_CHANGED,
      expect.objectContaining({
        serviceId: 'svc-1',
        date: new Date('2026-03-20'),
      }),
    );
  });
});
