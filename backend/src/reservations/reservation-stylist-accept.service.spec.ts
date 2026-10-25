import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ReservationStylistAcceptService } from './reservation-stylist-accept.service';
import { ReservationSharedService } from './reservation-shared.service';
import { ReservationQueriesService } from './reservation-queries.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../events/events.gateway';

const reservationDate = new Date('2026-03-20T00:00:00.000Z');
const dayOfWeek = reservationDate.getUTCDay();
const response = (overrides: Record<string, unknown> = {}) => ({
  stylistProfileId: 'sp-1',
  status: 'LOCKED',
  hasLockedOnce: true,
  lockExpiresAt: new Date(Date.now() + 600_000),
  ...overrides,
});
const reservation = (overrides: Record<string, unknown> = {}) => ({
  id: 'res-1',
  status: 'STYLIST_REVIEW',
  startTime: '10:00',
  endTime: '11:00',
  reservationDate,
  clientId: 'client-1',
  serviceId: 'svc-1',
  confirmedStylistId: null,
  items: [],
  stylistResponses: [response()],
  ...overrides,
});

const mockPrisma: any = {
  $queryRaw: jest.fn().mockResolvedValue([{ acquired: true }]),
  $transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
    callback(mockPrisma),
  ),
  stylistProfile: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  stylistService: {
    findMany: jest.fn(),
  },
  reservation: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  reservationStylistResponse: {
    updateMany: jest.fn(),
  },
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
    reservationDate,
  }),
};
const makePushContext = () => ({
  publicReferenceCode: 'RZ-20260320-ABC',
  reservationDate,
  startTime: '10:00',
  endTime: '11:00',
  attendancePolicy: 'CLIENT_REQUIRED',
  service: { name: 'Šišanje' },
  items: [],
});

const mockFindUniqueForAccept = (
  current = reservation(),
  clientData: Record<string, unknown> = {
    clientId: 'client-1',
    service: { name: 'Šišanje' },
    reservationDate,
    startTime: '10:00',
    publicReferenceCode: 'RZ-20260320-ABC',
    clientViewToken: 'token-abc',
  },
) => {
  mockPrisma.reservation.findUnique
    .mockResolvedValueOnce({ reservationDate })
    .mockResolvedValueOnce(current)
    .mockResolvedValueOnce(clientData)
    .mockResolvedValueOnce(makePushContext());
};

describe('ReservationStylistAcceptService', () => {
  let service: ReservationStylistAcceptService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.reservation.findUnique.mockReset();
    mockPrisma.reservation.findMany.mockReset();
    mockPrisma.reservation.findMany.mockResolvedValue([]);
    mockPrisma.reservation.updateMany.mockReset();
    mockPrisma.reservation.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.reservationStylistResponse.updateMany.mockReset();
    mockPrisma.reservationStylistResponse.updateMany.mockResolvedValue({
      count: 1,
    });
    mockPrisma.stylistProfile.findUnique.mockResolvedValue({
      userId: 'user-1',
    });
    mockPrisma.stylistService.findMany.mockResolvedValue([
      { stylistProfileId: 'sp-1', serviceId: 'svc-1' },
    ]);
    mockPrisma.stylistProfile.findMany.mockResolvedValue([
      {
        id: 'sp-1',
        workingHours: [
          {
            dateOverride: null,
            dayOfWeek,
            startTime: '09:00',
            endTime: '17:00',
          },
        ],
      },
    ]);
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

  it('accepts an expired lock after prior lock history and rechecks capacity in the transaction', async () => {
    mockFindUniqueForAccept(
      reservation({
        stylistResponses: [
          response({ lockExpiresAt: new Date(Date.now() - 60_000) }),
        ],
      }),
    );

    const result = await service.stylistAccept('res-1', 'sp-1', 'user-1');
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    expect(mockPrisma.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: 'res-1' },
        }),
      }),
    );
    expect(mockShared.transitionTo).toHaveBeenCalledWith(
      'STYLIST_REVIEW',
      'CONFIRMED',
    );
    expect(
      mockPrisma.reservationStylistResponse.updateMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          reservationId: 'res-1',
          stylistProfileId: 'sp-1',
          status: 'LOCKED',
        }),
        data: expect.objectContaining({ status: 'ACCEPTED' }),
      }),
    );
    expect(mockPrisma.reservation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'res-1',
          status: 'STYLIST_REVIEW',
          confirmedStylistId: null,
        }),
        data: expect.objectContaining({
          status: 'CONFIRMED',
          confirmedStylistId: 'sp-1',
        }),
      }),
    );
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

  it('rejects an acceptance that conflicts with another confirmed booking', async () => {
    mockFindUniqueForAccept(reservation());
    mockPrisma.reservation.findMany.mockResolvedValue([
      {
        id: 'res-other',
        startTime: '10:30',
        endTime: '11:30',
        status: 'CONFIRMED',
        confirmedStylistId: 'sp-1',
        stylistResponses: [],
      },
    ]);

    await expect(
      service.stylistAccept('res-1', 'sp-1', 'user-1'),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.reservation.updateMany).not.toHaveBeenCalled();
  });

  it('does not overwrite a reservation that changed before the conditional state update', async () => {
    mockFindUniqueForAccept(reservation());
    mockPrisma.reservation.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      service.stylistAccept('res-1', 'sp-1', 'user-1'),
    ).rejects.toThrow(ConflictException);
  });
});
