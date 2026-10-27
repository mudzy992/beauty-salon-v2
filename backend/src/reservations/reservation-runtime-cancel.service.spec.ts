import { Test, TestingModule } from '@nestjs/testing';
import { ReservationRuntimeCancelService } from './reservation-runtime-cancel.service';
import { ReservationSharedService } from './reservation-shared.service';
import { ReservationQueriesService } from './reservation-queries.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../events/events.gateway';

const mockPrisma: any = {
  reservation: { findUnique: jest.fn(), update: jest.fn() },
  salonSettings: { findFirst: jest.fn() },
  clientCancellationCount: { findUnique: jest.fn(), upsert: jest.fn() },
};
const mockNotifications = { send: jest.fn() };
const mockEvents = {
  emitToAdmins: jest.fn(),
  emitToUser: jest.fn(),
  emitToAll: jest.fn(),
};
const mockShared = {
  getStylistProfileIdByUserId: jest.fn(),
  transitionTo: jest.fn((_from: string, to: string) => to),
  incrementCancellationCount: jest.fn(),
};
const mockQueries = {
  findOne: jest.fn().mockResolvedValue({
    id: 'res-1',
    serviceId: 'svc-1',
    reservationDate: new Date('2026-03-20'),
  }),
};

describe('ReservationRuntimeCancelService — stylistMarkNoShow', () => {
  let service: ReservationRuntimeCancelService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationRuntimeCancelService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: EventsGateway, useValue: mockEvents },
        { provide: ReservationSharedService, useValue: mockShared },
        { provide: ReservationQueriesService, useValue: mockQueries },
      ],
    }).compile();
    service = module.get(ReservationRuntimeCancelService);
  });

  it('updates status to NO_SHOW and applies penalty by default', async () => {
    mockShared.getStylistProfileIdByUserId.mockResolvedValue('sp-1');
    mockPrisma.reservation.findUnique.mockResolvedValue({
      id: 'res-1',
      clientId: 'client-1',
      serviceId: 'svc-1',
      reservationDate: new Date('2026-03-20'),
      confirmedStylistId: 'sp-1',
      status: 'ATTENDANCE_CONFIRMED',
      items: [],
    });
    mockPrisma.salonSettings.findFirst.mockResolvedValue({
      maxCancellationsBeforePenalty: 3,
      penaltyDurationDays: 30,
    });

    const result = await service.stylistMarkNoShow('res-1', 'user-1', {
      reason: 'Klijent se nije pojavio',
    });

    expect(mockShared.transitionTo).toHaveBeenCalledWith(
      'ATTENDANCE_CONFIRMED',
      'NO_SHOW',
    );
    expect(mockPrisma.reservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'NO_SHOW' }),
      }),
    );
    expect(mockShared.incrementCancellationCount).toHaveBeenCalledWith(
      'client-1',
      expect.objectContaining({ maxCancellationsBeforePenalty: 3 }),
    );
    expect(mockNotifications.send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'reservation_cancelled' }),
    );
    expect(result).toBeDefined();
  });

  it('skips penalty when applyPenalty is false', async () => {
    mockShared.getStylistProfileIdByUserId.mockResolvedValue('sp-1');
    mockPrisma.reservation.findUnique.mockResolvedValue({
      id: 'res-1',
      clientId: 'client-1',
      serviceId: 'svc-1',
      reservationDate: new Date('2026-03-20'),
      confirmedStylistId: 'sp-1',
      status: 'CONFIRMED',
      items: [],
    });

    await service.stylistMarkNoShow('res-1', 'user-1', {
      reason: 'Stilist oprostio',
      applyPenalty: false,
    });

    expect(mockPrisma.reservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'NO_SHOW' }),
      }),
    );
    expect(mockShared.incrementCancellationCount).not.toHaveBeenCalled();
  });
});
