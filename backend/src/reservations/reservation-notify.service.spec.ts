import { Test } from '@nestjs/testing';
import { ReservationNotifyService } from './reservation-notify.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

const mockNotifications = { send: jest.fn() };
const mockPrisma = { notification: { findFirst: jest.fn() } };

describe('ReservationNotifyService', () => {
  let service: ReservationNotifyService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ReservationNotifyService,
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(ReservationNotifyService);
  });

  it('notifyClientTimeChanged šalje reservation_time_changed', async () => {
    await service.notifyClientTimeChanged({
      clientId: 'client-1',
      reservationId: 'res-1',
      date: '2026-08-20',
      startTime: '09:00',
      endTime: '10:00',
      publicReferenceCode: 'RZ-1',
      clientViewToken: 'tok',
    });
    expect(mockNotifications.send).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'client-1',
        type: 'reservation_reminder',
        data: expect.objectContaining({
          kind: 'reservation_time_changed',
          reservationId: 'res-1',
        }),
      }),
    );
    const body = mockNotifications.send.mock.calls[0][0].body as string;
    expect(body).toContain('2026-08-20');
    expect(body).toContain('09:00–10:00');
    expect(body).toContain('Nije potrebna vaša potvrda');
  });

  it('notifyStylistPendingDailyLog šalje daily_log_pending_reminder', async () => {
    await service.notifyStylistPendingDailyLog({
      stylistUserId: 'stylist-user',
      reservationId: 'res-1',
      dailyLogEntryId: 'dk-1',
    });
    expect(mockNotifications.send).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'stylist-user',
        data: expect.objectContaining({
          kind: 'daily_log_pending_reminder',
          dailyLogEntryId: 'dk-1',
        }),
      }),
    );
  });
});
