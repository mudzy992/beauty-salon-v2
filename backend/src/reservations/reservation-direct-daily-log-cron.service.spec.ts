import { Test } from '@nestjs/testing';
import { ReservationDirectDailyLogCronService } from './reservation-direct-daily-log-cron.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationDateService } from './reservation-date.service';
import { DailyLogSeedFromDirectService } from '../daily-log/daily-log-seed-from-direct.service';
import { ReservationNotifyService } from './reservation-notify.service';

const mockPrisma: any = {
  reservation: { findMany: jest.fn(), update: jest.fn() },
  dailyLogEntry: { findMany: jest.fn(), update: jest.fn() },
};
const mockDates = {
  getDailyLogReminderHours: jest.fn().mockResolvedValue(12),
  combineDateAndTime: jest.fn(),
};
const mockSeed = { seedPendingFromDirectReservation: jest.fn() };
const mockNotify = { notifyStylistPendingDailyLog: jest.fn() };

describe('ReservationDirectDailyLogCronService', () => {
  let service: ReservationDirectDailyLogCronService;

  beforeEach(async () => {
    jest.clearAllMocks();
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

  it('šalje reminder jednom i ne mijenja status rezervacije', async () => {
    mockPrisma.dailyLogEntry.findMany.mockResolvedValue([
      {
        id: 'dk-1',
        reservationId: 'res-1',
        stylistProfile: { userId: 'stylist-user' },
        reservation: { publicReferenceCode: 'RZ-1' },
      },
    ]);
    mockPrisma.dailyLogEntry.update.mockResolvedValue({});

    const actual = await service.processPendingDailyLogReminders();

    expect(actual).toEqual({ remindedCount: 1 });
    expect(mockNotify.notifyStylistPendingDailyLog).toHaveBeenCalledTimes(1);
    expect(mockPrisma.dailyLogEntry.update).toHaveBeenCalledWith({
      where: { id: 'dk-1' },
      data: { pendingReminderSentAt: expect.any(Date) },
    });
    expect(mockPrisma.reservation.update).not.toHaveBeenCalled();
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

  it('ne šalje ako nema stale zapisa', async () => {
    mockPrisma.dailyLogEntry.findMany.mockResolvedValue([]);
    const actual = await service.processPendingDailyLogReminders();
    expect(actual).toEqual({ remindedCount: 0 });
    expect(mockNotify.notifyStylistPendingDailyLog).not.toHaveBeenCalled();
  });
});
