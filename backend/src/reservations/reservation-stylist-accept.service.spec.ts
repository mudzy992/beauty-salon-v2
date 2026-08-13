import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ReservationStylistAcceptService } from './reservation-stylist-accept.service';
import { ReservationSharedService } from './reservation-shared.service';
import { ReservationQueriesService } from './reservation-queries.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../events/events.gateway';

const mockPrisma: any = {
  stylistProfile: { findUnique: jest.fn() },
  reservation: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  reservationStylistResponse: { update: jest.fn(), updateMany: jest.fn() },
  $transaction: jest.fn(async (ops: unknown[]) => ops),
};
const mockNotifications = { send: jest.fn() };
const mockEvents = {
  emitToAdmins: jest.fn(),
  emitToUser: jest.fn(),
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

describe('ReservationStylistAcceptService', () => {
  let service: ReservationStylistAcceptService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationStylistAcceptService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: EventsGateway, useValue: mockEvents },
        { provide: ReservationSharedService, useValue: mockShared },
        { provide: ReservationQueriesService, useValue: mockQueries },
      ],
    }).compile();
    service = module.get(ReservationStylistAcceptService);
  });

  it('accepts after expired lock when hasLockedOnce', async () => {
    mockPrisma.stylistProfile.findUnique.mockResolvedValue({ userId: 'user-1' });
    mockPrisma.reservation.findUnique
      .mockResolvedValueOnce({
        id: 'res-1',
        status: 'STYLIST_REVIEW',
        startTime: '10:00',
        endTime: '11:00',
        reservationDate: new Date('2026-03-20'),
        stylistResponses: [
          {
            stylistProfileId: 'sp-1',
            status: 'LOCKED',
            hasLockedOnce: true,
            lockExpiresAt: new Date(Date.now() - 60_000),
          },
        ],
      })
      .mockResolvedValueOnce({
        clientId: 'client-1',
        service: { name: 'Šišanje' },
        reservationDate: new Date('2026-03-20'),
        startTime: '10:00',
        publicReferenceCode: 'RZ-20260320-ABC',
        clientViewToken: 'token-abc',
      });
    mockPrisma.reservation.findMany.mockResolvedValue([]);

    const result = await service.stylistAccept('res-1', 'sp-1', 'user-1');
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('rejects when overlapping SLOT_OCCUPYING reservation on same stylist/day', async () => {
    mockPrisma.stylistProfile.findUnique.mockResolvedValue({ userId: 'user-1' });
    mockPrisma.reservation.findUnique.mockResolvedValue({
      id: 'res-1',
      status: 'STYLIST_REVIEW',
      startTime: '10:00',
      endTime: '11:00',
      reservationDate: new Date('2026-03-20'),
      stylistResponses: [
        {
          stylistProfileId: 'sp-1',
          status: 'LOCKED',
          lockExpiresAt: new Date(Date.now() + 600_000),
        },
      ],
    });
    mockPrisma.reservation.findMany.mockResolvedValue([
      { id: 'res-other', startTime: '10:30', endTime: '11:30' },
    ]);

    await expect(
      service.stylistAccept('res-1', 'sp-1', 'user-1'),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.stylistAccept('res-1', 'sp-1', 'user-1'),
    ).rejects.toThrow(/preklapa/);
  });

  it('happy path: updates to CONFIRMED, notifies client, emits events', async () => {
    mockPrisma.stylistProfile.findUnique.mockResolvedValue({ userId: 'user-1' });
    mockPrisma.reservation.findUnique
      .mockResolvedValueOnce({
        id: 'res-1',
        status: 'STYLIST_REVIEW',
        startTime: '10:00',
        endTime: '11:00',
        reservationDate: new Date('2026-03-20'),
        stylistResponses: [
          {
            stylistProfileId: 'sp-1',
            status: 'LOCKED',
            lockExpiresAt: new Date(Date.now() + 600_000),
          },
        ],
      })
      .mockResolvedValueOnce({
        clientId: 'client-1',
        service: { name: 'Šišanje' },
        reservationDate: new Date('2026-03-20'),
        startTime: '10:00',
        publicReferenceCode: 'RZ-20260320-ABC',
        clientViewToken: 'token-abc',
      });
    mockPrisma.reservation.findMany.mockResolvedValue([]);

    const result = await service.stylistAccept('res-1', 'sp-1', 'user-1');

    expect(mockShared.transitionTo).toHaveBeenCalledWith(
      'STYLIST_REVIEW',
      'CONFIRMED',
    );
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockNotifications.send).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'client-1',
        type: 'reservation_confirmed',
      }),
    );
    expect(mockEvents.emitToAdmins).toHaveBeenCalled();
    expect(mockEvents.emitToUser).toHaveBeenCalledWith(
      'client-1',
      expect.any(String),
      expect.any(Object),
    );
    expect(mockEvents.emitToAll).toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});
