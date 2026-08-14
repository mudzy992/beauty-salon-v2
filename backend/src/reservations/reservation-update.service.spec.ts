import { Test } from '@nestjs/testing';
import { ReservationUpdateService } from './reservation-update.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { ReservationDateService } from './reservation-date.service';
import { ReservationQueriesService } from './reservation-queries.service';
import { ReservationNotifyService } from './reservation-notify.service';
import { ReservationSharedService } from './reservation-shared.service';

const existing = {
  id: 'res-1',
  reservationDate: new Date('2026-08-20T00:00:00.000Z'),
  startTime: '09:00',
  endTime: '10:00',
  status: 'CONFIRMED',
  confirmedStylistId: null,
  serviceId: 'svc-1',
  clientId: 'client-1',
  publicReferenceCode: 'RZ-1',
  clientViewToken: 'tok',
  items: [],
};

const mockPrisma: any = {
  reservation: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    update: jest.fn(),
  },
  dailyLogEntry: { updateMany: jest.fn() },
  salonSettings: { findFirst: jest.fn() },
  holiday: { findFirst: jest.fn() },
  salonWorkingHours: { findUnique: jest.fn() },
};
const mockEvents = {
  emitToAdmins: jest.fn(),
  emitToUser: jest.fn(),
  emitToAll: jest.fn(),
};
const mockDates = {
  parseDateOnly: jest.fn((v: Date | string) =>
    typeof v === 'string' ? new Date(`${v}T00:00:00.000Z`) : v,
  ),
  toLocalDateOnlyString: jest.fn((d: Date) => d.toISOString().slice(0, 10)),
};
const mockQueries = { findOne: jest.fn().mockResolvedValue({ id: 'res-1' }) };
const mockNotify = { notifyClientTimeChanged: jest.fn() };
const mockShared = {
  transitionTo: jest.fn((_from: string, to: string) => to),
};

describe('ReservationUpdateService', () => {
  let service: ReservationUpdateService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.reservation.findUnique.mockResolvedValue({ ...existing });
    mockPrisma.reservation.update.mockResolvedValue({ id: 'res-1' });
    mockPrisma.dailyLogEntry.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.salonSettings.findFirst.mockResolvedValue({ id: 'salon-1' });
    mockPrisma.holiday.findFirst.mockResolvedValue(null);
    mockPrisma.salonWorkingHours.findUnique.mockResolvedValue({
      isWorkingDay: true,
      openTime: '08:00',
      closeTime: '20:00',
    });
    const module = await Test.createTestingModule({
      providers: [
        ReservationUpdateService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventsGateway, useValue: mockEvents },
        { provide: ReservationDateService, useValue: mockDates },
        { provide: ReservationQueriesService, useValue: mockQueries },
        { provide: ReservationNotifyService, useValue: mockNotify },
        { provide: ReservationSharedService, useValue: mockShared },
      ],
    }).compile();
    service = module.get(ReservationUpdateService);
  });

  it('šalje notify kad se vrijeme promijeni', async () => {
    await service.updateByAdmin('res-1', {
      startTime: '11:00',
      endTime: '12:00',
    });
    expect(mockNotify.notifyClientTimeChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'client-1',
        reservationId: 'res-1',
        startTime: '11:00',
        endTime: '12:00',
      }),
    );
    expect(mockEvents.emitToUser).toHaveBeenCalledWith(
      'client-1',
      expect.any(String),
      expect.anything(),
    );
  });

  it('ne šalje notify kad datum i vrijeme ostaju isti', async () => {
    await service.updateByAdmin('res-1', {
      reservationDate: '2026-08-20',
      startTime: '09:00',
      endTime: '10:00',
    });
    expect(mockNotify.notifyClientTimeChanged).not.toHaveBeenCalled();
    expect(mockEvents.emitToUser).toHaveBeenCalled();
  });

  it('AWAITING_DAILY_LOG + nova vremena → CONFIRMED i zatvara PENDING DK', async () => {
    mockPrisma.reservation.findUnique.mockResolvedValue({
      ...existing,
      status: 'AWAITING_DAILY_LOG',
    });
    mockPrisma.dailyLogEntry.updateMany.mockResolvedValue({ count: 1 });
    await service.updateByAdmin('res-1', {
      startTime: '14:00',
      endTime: '15:00',
    });
    expect(mockShared.transitionTo).toHaveBeenCalledWith(
      'AWAITING_DAILY_LOG',
      'CONFIRMED',
    );
    expect(mockPrisma.reservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'CONFIRMED',
          startTime: '14:00',
          endTime: '15:00',
        }),
      }),
    );
    expect(mockPrisma.dailyLogEntry.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          reservationId: 'res-1',
          status: 'PENDING',
        }),
        data: expect.objectContaining({
          deleteReason: 'Pomjereno sa kalendara',
        }),
      }),
    );
    expect(mockNotify.notifyClientTimeChanged).toHaveBeenCalled();
  });

  it('AWAITING_DAILY_LOG bez promjene vremena ne zatvara DK', async () => {
    mockPrisma.reservation.findUnique.mockResolvedValue({
      ...existing,
      status: 'AWAITING_DAILY_LOG',
    });
    await service.updateByAdmin('res-1', {
      reservationDate: '2026-08-20',
      startTime: '09:00',
      endTime: '10:00',
    });
    expect(mockShared.transitionTo).not.toHaveBeenCalled();
    expect(mockPrisma.dailyLogEntry.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.reservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reservationDate: expect.any(Date),
          startTime: '09:00',
          endTime: '10:00',
        }),
      }),
    );
    expect(mockPrisma.reservation.update.mock.calls[0][0].data.status).toBeUndefined();
  });

  it('CONFIRMED PATCH ne dira DK', async () => {
    await service.updateByAdmin('res-1', {
      startTime: '11:00',
      endTime: '12:00',
    });
    expect(mockPrisma.dailyLogEntry.updateMany).not.toHaveBeenCalled();
    expect(mockShared.transitionTo).not.toHaveBeenCalled();
  });
});
