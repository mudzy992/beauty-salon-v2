import { Test } from '@nestjs/testing';
import { ReservationDirectDailyLogCronService } from './reservation-direct-daily-log-cron.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationDateService } from './reservation-date.service';
import { DailyLogSeedFromDirectService } from '../daily-log/daily-log-seed-from-direct.service';
import { ReservationNotifyService } from './reservation-notify.service';

const mockPrisma: any = {
  reservation: { findMany: jest.fn(), update: jest.fn() },
  dailyLogEntry: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  outboxEvent: { createMany: jest.fn() },
};
const mockDates = {
  getDailyLogReminderHours: jest.fn().mockResolvedValue(12),
  toSalonDateOnlyString: jest.fn().mockReturnValue('2026-01-15'),
  combineDateAndTime: jest.fn(),
};
const mockSeed = { seedPendingFromDirectReservation: jest.fn() };
const mockNotify = { notifyStylistPendingDailyLog: jest.fn() };

describe('ReservationDirectDailyLogCronService', () => {
  let service: ReservationDirectDailyLogCronService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.outboxEvent.createMany.mockResolvedValue({ count: 1 });
    mockPrisma.dailyLogEntry.updateMany.mockResolvedValue({ count: 1 });
    mockNotify.notifyStylistPendingDailyLog.mockResolvedValue(undefined);
    const module = await Test.createTestingModule({
      providers: [
        ReservationDirectDailyLogCronService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ReservationDateService, useValue: mockDates },
        { provide: DailyLogSeedFromDirectService, useValue: mockSeed },
        { provide: ReservationNotifyService, useValue: mockNotify },
      ],
    }).compile();
    service = module.get(ReservationDirectDailyLogCronService);
  });

  it('filtrira sedmodnevni seed lookback po salonskim kalendarskim datumima', async () => {
    mockPrisma.reservation.findMany.mockResolvedValue([]);

    await service.processDirectBookingDailyLogSeeds();

    expect(mockPrisma.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          reservationDate: { gte: new Date('2026-01-08T00:00:00.000Z') },
          dailyLogEntry: { none: { kind: 'SERVICE' } },
        }),
      }),
    );
  });

  it('queues a deduplicated reminder event without sending immediately', async () => {
    mockPrisma.dailyLogEntry.findMany.mockResolvedValue([
      { id: 'dk-1', reservationId: 'res-1' },
    ]);

    const actual = await service.processPendingDailyLogReminders();

    expect(actual).toEqual({ queuedCount: 1 });
    expect(mockNotify.notifyStylistPendingDailyLog).not.toHaveBeenCalled();
    expect(mockPrisma.outboxEvent.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          eventType: 'reservation.daily_log_pending_reminder',
          aggregateId: 'dk-1',
          dedupeKey: 'daily-log-entry:dk-1:pending-reminder',
          payload: { dailyLogEntryId: 'dk-1', reservationId: 'res-1' },
        }),
      ],
      skipDuplicates: true,
    });
    expect(mockPrisma.dailyLogEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'PENDING',
          pendingReminderSentAt: null,
          reservation: { status: 'AWAITING_DAILY_LOG' },
        }),
      }),
    );
  });

  it('revalidates eligibility and sends with the stable outbox source ID', async () => {
    mockPrisma.dailyLogEntry.findUnique.mockResolvedValueOnce({
      id: 'dk-1',
      reservationId: 'res-1',
      status: 'PENDING',
      deletedAt: null,
      pendingReminderSentAt: null,
      createdAt: new Date(Date.now() - 13 * 60 * 60 * 1000),
      stylistProfile: { userId: 'stylist-user' },
      reservation: {
        status: 'AWAITING_DAILY_LOG',
        publicReferenceCode: 'RZ-1',
      },
    });

    await service.deliverPendingDailyLogReminder('event-1', {
      dailyLogEntryId: 'dk-1',
      reservationId: 'res-1',
    });

    expect(mockNotify.notifyStylistPendingDailyLog).toHaveBeenCalledWith({
      stylistUserId: 'stylist-user',
      reservationId: 'res-1',
      dailyLogEntryId: 'dk-1',
      publicReferenceCode: 'RZ-1',
      sourceEventId: 'event-1',
    });
    expect(mockPrisma.dailyLogEntry.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: 'dk-1',
        status: 'PENDING',
        pendingReminderSentAt: null,
      }),
      data: { pendingReminderSentAt: expect.any(Date) },
    });
  });

  it('suppresses the reminder if the daily log is no longer pending for an awaiting reservation', async () => {
    mockPrisma.dailyLogEntry.findUnique.mockResolvedValueOnce({
      id: 'dk-1',
      reservationId: 'res-1',
      status: 'COMPLETED',
      deletedAt: null,
      pendingReminderSentAt: null,
      createdAt: new Date(Date.now() - 13 * 60 * 60 * 1000),
      stylistProfile: { userId: 'stylist-user' },
      reservation: {
        status: 'COMPLETED',
        publicReferenceCode: 'RZ-1',
      },
    });

    await service.deliverPendingDailyLogReminder('event-1', {
      dailyLogEntryId: 'dk-1',
      reservationId: 'res-1',
    });

    expect(mockNotify.notifyStylistPendingDailyLog).not.toHaveBeenCalled();
    expect(mockPrisma.dailyLogEntry.updateMany).not.toHaveBeenCalled();
  });

  it('ne kreira reminder događaj ako nema zastarjelih unosa', async () => {
    mockPrisma.dailyLogEntry.findMany.mockResolvedValue([]);
    const actual = await service.processPendingDailyLogReminders();
    expect(actual).toEqual({ queuedCount: 0 });
    expect(mockPrisma.outboxEvent.createMany).not.toHaveBeenCalled();
  });
});
