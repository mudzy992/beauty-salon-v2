import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { ReservationUpdateService } from './reservation-update.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { ReservationDateService } from './reservation-date.service';
import { ReservationQueriesService } from './reservation-queries.service';
import { ReservationNotifyService } from './reservation-notify.service';
import { ReservationSharedService } from './reservation-shared.service';

const date = new Date('2026-08-20T00:00:00.000Z');
const existing = {
  id: 'res-1',
  reservationDate: date,
  startTime: '09:00',
  endTime: '10:00',
  status: 'CONFIRMED',
  confirmedStylistId: null,
  serviceId: 'svc-1',
  clientId: 'client-1',
  publicReferenceCode: 'RZ-1',
  clientViewToken: 'tok',
  items: [],
  stylistResponses: [],
};
const dayOfWeek = date.getUTCDay();

const mockPrisma: any = {
  $queryRaw: jest.fn().mockResolvedValue([{ acquired: true }]),
  $transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
    callback(mockPrisma),
  ),
  reservation: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  stylistProfile: {
    findMany: jest.fn().mockResolvedValue([
      {
        id: 'sp-1',
        workingHours: [
          {
            dateOverride: null,
            dayOfWeek,
            startTime: '08:00',
            endTime: '20:00',
          },
        ],
      },
    ]),
  },
  stylistService: {
    findMany: jest
      .fn()
      .mockResolvedValue([{ stylistProfileId: 'sp-1', serviceId: 'svc-1' }]),
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
  parseDateOnly: jest.fn((value: Date | string) =>
    typeof value === 'string' ? new Date(`${value}T00:00:00.000Z`) : value,
  ),
  toLocalDateOnlyString: jest.fn((value: Date) =>
    value.toISOString().slice(0, 10),
  ),
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
    mockPrisma.reservation.findUnique.mockReset();
    mockPrisma.reservation.findUnique.mockResolvedValue({
      ...existing,
      reservationDate: new Date(existing.reservationDate),
      items: [],
      stylistResponses: [],
    });
    mockPrisma.reservation.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.reservation.findMany.mockResolvedValue([]);
    mockPrisma.dailyLogEntry.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.salonSettings.findFirst.mockResolvedValue({ id: 'salon-1' });
    mockPrisma.holiday.findFirst.mockResolvedValue(null);
    mockPrisma.salonWorkingHours.findUnique.mockResolvedValue({
      isWorkingDay: true,
      openTime: '08:00',
      closeTime: '20:00',
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
            startTime: '08:00',
            endTime: '20:00',
          },
        ],
      },
    ]);
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

  it('sends notification when the appointment time changes in the guarded transaction', async () => {
    await service.updateByAdmin('res-1', {
      startTime: '11:00',
      endTime: '12:00',
    });
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    expect(mockPrisma.reservation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'res-1',
          status: 'CONFIRMED',
          startTime: '09:00',
          endTime: '10:00',
        }),
        data: expect.objectContaining({
          startTime: '11:00',
          endTime: '12:00',
        }),
      }),
    );
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

  it('does not send a time-change notification when date and time stay the same', async () => {
    await service.updateByAdmin('res-1', {
      reservationDate: '2026-08-20',
      startTime: '09:00',
      endTime: '10:00',
    });
    expect(mockNotify.notifyClientTimeChanged).not.toHaveBeenCalled();
    expect(mockEvents.emitToUser).toHaveBeenCalled();
  });

  it('AWAITING_DAILY_LOG + new times transitions to CONFIRMED and closes the pending log in the transaction', async () => {
    mockPrisma.reservation.findUnique.mockResolvedValue({
      ...existing,
      status: 'AWAITING_DAILY_LOG',
      reservationDate: new Date(existing.reservationDate),
      items: [],
      stylistResponses: [],
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
    expect(mockPrisma.reservation.updateMany).toHaveBeenCalledWith(
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

  it('AWAITING_DAILY_LOG without a schedule change does not close the daily log', async () => {
    mockPrisma.reservation.findUnique.mockResolvedValue({
      ...existing,
      status: 'AWAITING_DAILY_LOG',
      reservationDate: new Date(existing.reservationDate),
      items: [],
      stylistResponses: [],
    });
    await service.updateByAdmin('res-1', {
      reservationDate: '2026-08-20',
      startTime: '09:00',
      endTime: '10:00',
    });
    expect(mockShared.transitionTo).not.toHaveBeenCalled();
    expect(mockPrisma.dailyLogEntry.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.reservation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reservationDate: expect.any(Date),
          startTime: '09:00',
          endTime: '10:00',
        }),
      }),
    );
  });

  it('rejects a stale schedule snapshot after acquiring the target-day lock', async () => {
    mockPrisma.reservation.findUnique
      .mockResolvedValueOnce({
        ...existing,
        reservationDate: new Date(existing.reservationDate),
      })
      .mockResolvedValueOnce({
        ...existing,
        reservationDate: new Date('2026-08-21T00:00:00.000Z'),
      });
    await expect(
      service.updateByAdmin('res-1', { startTime: '11:00', endTime: '12:00' }),
    ).rejects.toThrow(ConflictException);
    expect(mockPrisma.reservation.updateMany).not.toHaveBeenCalled();
  });
});
