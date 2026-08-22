import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationSharedService } from './reservation-shared.service';
import { ReservationNotifyService } from './reservation-notify.service';
import { ReservationQueriesService } from './reservation-queries.service';
import { ReservationListService } from './reservation-list.service';
import { ReservationCreateService } from './reservation-create.service';
import { ReservationUpdateService } from './reservation-update.service';
import { ReservationClientActionsService } from './reservation-client-actions.service';
import { ReservationStaffAttendanceService } from './reservation-staff-attendance.service';
import { ReservationStylistLockService } from './reservation-stylist-lock.service';
import { ReservationStylistAcceptService } from './reservation-stylist-accept.service';
import { ReservationStylistRejectService } from './reservation-stylist-reject.service';
import { ReservationRuntimeService } from './reservation-runtime.service';
import { ReservationRuntimeCancelService } from './reservation-runtime-cancel.service';
import { ReservationRescheduleService } from './reservation-reschedule.service';
import { ReservationRescheduleCommitService } from './reservation-reschedule-commit.service';
import { ReservationRescheduleClientService } from './reservation-reschedule-client.service';
import { ReservationReorderService } from './reservation-reorder.service';
import { ReservationCronService } from './reservation-cron.service';
import { ReservationAttendanceCronService } from './reservation-attendance-cron.service';
import { ReservationReorderCronService } from './reservation-reorder-cron.service';
import { ReservationDirectCreateService } from './reservation-direct-create.service';
import { ReservationDirectDailyLogCronService } from './reservation-direct-daily-log-cron.service';
import { ReservationInboxCronService } from './reservation-inbox-cron.service';
import { AvailabilityService } from './availability.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { ReservationDateService } from './reservation-date.service';
import { SettingsService } from '../settings/settings.service';

jest.mock('expo-server-sdk', () => {
  class MockExpo {
    static isExpoPushToken() {
      return true;
    }
    chunkPushNotifications(messages: unknown[]) {
      return [messages];
    }
    async sendPushNotificationsAsync() {
      return [];
    }
  }
  return { __esModule: true, default: MockExpo };
});

const mockPrisma: any = {};
Object.assign(mockPrisma, {
  user: {
    findUnique: jest.fn(),
  },
  service: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  reservationServiceItem: {
    createMany: jest.fn(),
  },
  reservation: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  dailyLogEntry: {
    findFirst: jest.fn(),
  },
  notification: {
    findFirst: jest.fn(),
  },
  reservationStylistResponse: {
    createMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  stylistService: { findMany: jest.fn() },
  stylistProfile: { findUnique: jest.fn(), findMany: jest.fn() },
  salonSettings: { findFirst: jest.fn() },
  salonWorkingHours: { findUnique: jest.fn() },
  clientCancellationCount: { findUnique: jest.fn(), upsert: jest.fn() },
  $transaction: jest.fn(async (cb: unknown): Promise<unknown> => {
    if (typeof cb === 'function')
      return (cb as (tx: any) => unknown)(mockPrisma);
    return undefined;
  }),
});

const mockAvailability = {
  getAvailableSlots: jest.fn(),
};

const mockNotifications = {
  sendToMany: jest.fn(),
  send: jest.fn(),
};
const mockEvents = {
  emitToAdmins: jest.fn(),
  emitToStylists: jest.fn(),
  emitToAll: jest.fn(),
  emitToUser: jest.fn(),
};
const mockLoyalty = {
  ensureAccountForUser: jest.fn(),
  redeemForReservation: jest.fn(),
};
const mockSettings = {
  getString: jest.fn().mockResolvedValue('Europe/Sarajevo'),
};

describe('ReservationsService', () => {
  let service: ReservationsService;

  const userPayload = {
    sub: 'user-1',
    username: 'client',
    email: 'c@test.com',
    roles: ['CLIENT'],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.reservation.findMany.mockResolvedValue([]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        ReservationSharedService,
        ReservationNotifyService,
        ReservationQueriesService,
        ReservationListService,
        ReservationCreateService,
        ReservationUpdateService,
        ReservationClientActionsService,
        ReservationStaffAttendanceService,
        ReservationStylistLockService,
        ReservationStylistAcceptService,
        ReservationStylistRejectService,
        ReservationRuntimeService,
        ReservationRuntimeCancelService,
        ReservationRescheduleService,
        ReservationRescheduleCommitService,
        ReservationRescheduleClientService,
        ReservationReorderService,
        ReservationCronService,
        ReservationAttendanceCronService,
        ReservationReorderCronService,
        ReservationDirectCreateService,
        ReservationInboxCronService,
        {
          provide: ReservationDirectDailyLogCronService,
          useValue: {
            processDirectBookingDailyLogSeeds: jest.fn(),
            processPendingDailyLogReminders: jest.fn(),
          },
        },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AvailabilityService, useValue: mockAvailability },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: EventsGateway, useValue: mockEvents },
        { provide: LoyaltyService, useValue: mockLoyalty },
        { provide: SettingsService, useValue: mockSettings },
        ReservationDateService,
      ],
    }).compile();
    service = module.get<ReservationsService>(ReservationsService);
  });

  describe('create', () => {
    it('baca grešku kada korisnik mora promijeniti lozinku', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'client-1',
        email: 'client@test.com',
        phone: '+38761111222',
        isEmailVerified: true,
        mustChangePassword: true,
      });
      const dto = {
        serviceId: 'svc-1',
        reservationDate: '2026-03-20',
        startTime: '09:00',
        endTime: '10:00',
      };
      await expect(service.create(dto as any, 'client-1')).rejects.toThrow(
        'MUST_CHANGE_PASSWORD',
      );
    });

    it('baca grešku kada email nije verifikovan', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'client-1',
        email: 'client@test.com',
        phone: '+38761111222',
        isEmailVerified: false,
        mustChangePassword: false,
      });
      const dto = {
        serviceId: 'svc-1',
        reservationDate: '2026-03-20',
        startTime: '09:00',
        endTime: '10:00',
      };
      await expect(service.create(dto as any, 'client-1')).rejects.toThrow(
        'EMAIL_NOT_VERIFIED',
      );
    });

    it('baca BadRequestException kada termin nije dostupan', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'client-1',
        email: 'client@test.com',
        phone: '+38761111222',
        isEmailVerified: true,
        mustChangePassword: false,
        gender: 'FEMALE',
      });
      mockPrisma.service.findMany.mockResolvedValue([
        {
          id: 'svc-1',
          gender: 'FEMALE',
          name: 'Test',
          durationMinutes: 60,
          price: 50,
          loyaltyEnabled: false,
          loyaltyMaxDiscountPercent: 0,
        },
      ]);
      mockPrisma.clientCancellationCount.findUnique.mockResolvedValue(null);
      mockAvailability.getAvailableSlots.mockResolvedValue([
        { startTime: '10:00', endTime: '11:00', availableStylistCount: 1 },
      ]);
      const dto = {
        serviceId: 'svc-1',
        reservationDate: '2026-03-20',
        startTime: '09:00',
        endTime: '10:00',
      };
      await expect(service.create(dto as any, 'client-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dto as any, 'client-1')).rejects.toThrow(
        'Odabrani termin nije dostupan',
      );
    });

    it('kreira rezervaciju i PENDING odgovore kada je slot dostupan', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'client-1',
        email: 'client@test.com',
        phone: '+38761111222',
        isEmailVerified: true,
        mustChangePassword: false,
        gender: 'FEMALE',
      });
      mockPrisma.service.findMany.mockResolvedValue([
        {
          id: 'svc-1',
          gender: 'FEMALE',
          name: 'Šišanje',
          durationMinutes: 60,
          price: 50,
          loyaltyEnabled: false,
          loyaltyMaxDiscountPercent: 0,
        },
      ]);
      mockPrisma.clientCancellationCount.findUnique.mockResolvedValue(null);
      mockAvailability.getAvailableSlots.mockResolvedValue([
        { startTime: '09:00', endTime: '10:00', availableStylistCount: 2 },
      ]);
      mockPrisma.reservation.findFirst.mockResolvedValue(null);
      mockPrisma.reservation.create.mockResolvedValue({
        id: 'res-1',
        clientId: 'client-1',
        serviceId: 'svc-1',
        status: 'PENDING',
        service: { name: 'Šišanje' },
        client: { id: 'c1', firstName: 'A', lastName: 'B', email: 'a@b.com' },
      });
      mockPrisma.reservationServiceItem.createMany.mockResolvedValue({
        count: 1,
      });
      mockPrisma.stylistService.findMany.mockResolvedValue([
        { stylistProfileId: 'sp1', serviceId: 'svc-1' },
        { stylistProfileId: 'sp2', serviceId: 'svc-1' },
      ]);
      mockPrisma.reservationStylistResponse.createMany.mockResolvedValue({
        count: 2,
      });
      mockPrisma.stylistProfile.findMany.mockResolvedValue([
        { userId: 'stylist-1' },
        { userId: 'stylist-2' },
      ]);
      mockPrisma.reservation.findUnique.mockResolvedValue({
        id: 'res-1',
        clientId: 'client-1',
        confirmedStylistId: null,
        stylistResponses: [],
        service: {},
        client: {},
        confirmedStylist: null,
        items: [],
      });

      const dto = {
        serviceId: 'svc-1',
        reservationDate: '2026-03-20',
        startTime: '09:00',
        endTime: '10:00',
      };
      await service.create(dto as any, 'client-1');

      expect(mockPrisma.reservation.create).toHaveBeenCalled();
      expect(
        mockPrisma.reservationStylistResponse.createMany,
      ).toHaveBeenCalledWith({
        data: expect.any(Array),
      });
      expect(mockNotifications.sendToMany).toHaveBeenCalledWith(
        ['stylist-1', 'stylist-2'],
        'Nova rezervacija',
        expect.any(String),
        'reservation_new',
        expect.any(Object),
      );
    });
  });

  describe('createByAdmin', () => {
    it('ne baca MUST_CHANGE_PASSWORD kada admin kreira rezervaciju za klijenta', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'client-1',
        email: 'client@test.com',
        phone: '+38761111222',
        isEmailVerified: true,
        mustChangePassword: true,
        gender: 'FEMALE',
      });
      mockPrisma.service.findMany.mockResolvedValue([
        {
          id: 'svc-1',
          name: 'Test',
          gender: 'FEMALE',
          durationMinutes: 60,
          price: 50,
          loyaltyEnabled: false,
          loyaltyMaxDiscountPercent: 0,
        },
      ]);
      mockPrisma.clientCancellationCount.findUnique.mockResolvedValue(null);
      mockAvailability.getAvailableSlots.mockResolvedValue([
        { startTime: '09:00', endTime: '10:00', availableStylistCount: 1 },
      ]);
      mockPrisma.reservation.findFirst.mockResolvedValue(null);
      mockPrisma.reservation.create.mockResolvedValue({
        id: 'res-1',
        serviceId: 'svc-1',
        reservationDate: new Date('2026-03-20T00:00:00.000Z'),
        startTime: '09:00',
        endTime: '10:00',
        status: 'PENDING',
        clientNotes: null,
        publicReferenceCode: 'ABC123',
        clientViewToken: 'token',
        service: { id: 'svc-1', name: 'Test', gender: 'FEMALE' },
        client: {
          id: 'client-1',
          firstName: 'A',
          lastName: 'B',
          email: 'client@test.com',
        },
      } as any);
      mockPrisma.reservationServiceItem.createMany.mockResolvedValue({
        count: 1,
      });
      mockPrisma.stylistService.findMany.mockResolvedValue([
        { stylistProfileId: 'sty-1', serviceId: 'svc-1' },
      ]);
      mockPrisma.reservationStylistResponse.createMany.mockResolvedValue({
        count: 1,
      });
      mockPrisma.stylistProfile.findMany.mockResolvedValue([{ userId: 'u-1' }]);
      mockPrisma.reservation.findUnique.mockResolvedValue({
        id: 'res-1',
        clientId: 'client-1',
        confirmedStylistId: null,
        stylistResponses: [],
        service: {},
        client: {},
        confirmedStylist: null,
        items: [],
      });

      await expect(
        service.createByAdmin(
          {
            clientId: 'client-1',
            bookingMode: 'STANDARD',
            serviceId: 'svc-1',
            reservationDate: '2026-03-20',
            startTime: '09:00',
            endTime: '10:00',
          },
          'test-user1' as any,
        ),
      ).resolves.toBeTruthy();
    });
  });

  describe('cancelByClient', () => {
    it('baca ForbiddenException kada korisnik nije klijent rezervacije', async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue({
        id: 'res-1',
        clientId: 'other-client',
        status: 'CONFIRMED',
        reservationDate: new Date('2026-03-25'),
      });
      await expect(service.cancelByClient('res-1', 'client-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('baca BadRequestException kada je rok za otkazivanje istekao', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() + 1);
      pastDate.setHours(0, 0, 0, 0);
      mockPrisma.reservation.findUnique.mockResolvedValue({
        id: 'res-1',
        clientId: 'client-1',
        status: 'CONFIRMED',
        reservationDate: pastDate,
      });
      mockPrisma.salonSettings.findFirst.mockResolvedValue({
        cancellationDeadlineHours: 24,
        maxCancellationsBeforePenalty: 3,
        penaltyDurationDays: 30,
      });
      await expect(service.cancelByClient('res-1', 'client-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.cancelByClient('res-1', 'client-1')).rejects.toThrow(
        'Rok za otkazivanje',
      );
    });
  });

  describe('stylistLock', () => {
    it('baca ForbiddenException kada stylistProfileId ne pripada userId', async () => {
      mockPrisma.salonSettings.findFirst.mockResolvedValue({
        reservationLockMinutes: 15,
      });
      mockPrisma.reservation.findUnique.mockResolvedValue({
        id: 'res-1',
        status: 'PENDING',
        stylistResponses: [],
      });
      mockPrisma.stylistProfile.findUnique.mockResolvedValue({
        userId: 'other-user',
      });
      await expect(
        service.stylistLock('res-1', 'stylist-1', 'current-user'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.stylistLock('res-1', 'stylist-1', 'current-user'),
      ).rejects.toThrow('vlastitom profilu');
    });

    it('baca NotFoundException kada rezervacija ne postoji', async () => {
      mockPrisma.salonSettings.findFirst.mockResolvedValue({
        reservationLockMinutes: 15,
      });
      mockPrisma.reservation.findUnique.mockResolvedValue(null);
      await expect(
        service.stylistLock('res-1', 'stylist-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('declineReschedule', () => {
    it('za reorder decline ne otkazuje rezervaciju', async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue({
        id: 'res-1',
        clientId: 'client-1',
        serviceId: 'svc-1',
        reservationDate: new Date('2026-03-25'),
        rescheduleStatus: 'PENDING',
      });
      mockPrisma.notification.findFirst.mockResolvedValue({
        type: 'reservation_reminder',
        data: { kind: 'reservation_reorder', reservationId: 'res-1' },
      });
      mockPrisma.reservation.update.mockResolvedValue({});
      mockPrisma.reservation.findUnique.mockResolvedValueOnce({
        id: 'res-1',
        clientId: 'client-1',
        serviceId: 'svc-1',
        reservationDate: new Date('2026-03-25'),
        rescheduleStatus: 'PENDING',
      });
      mockPrisma.reservation.findUnique.mockResolvedValueOnce({
        id: 'res-1',
        clientId: 'client-1',
        confirmedStylistId: null,
        stylistResponses: [],
        service: {},
        client: {},
        confirmedStylist: null,
      });
      await service.declineReschedule('res-1', 'client-1');
      expect(mockPrisma.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rescheduleStatus: 'DECLINED',
          }),
        }),
      );
    });
  });

  describe('processPendingRescheduleTimeouts', () => {
    it('auto-otkazuje timeout pending reschedule i dodaje penal', async () => {
      const oldSent = new Date(Date.now() - 60 * 60 * 1000);
      mockPrisma.reservation.findMany.mockResolvedValue([
        {
          id: 'res-timeout',
          clientId: 'client-1',
          serviceId: 'svc-1',
          reservationDate: new Date('2026-03-25'),
          startTime: '12:00',
          status: 'ATTENDANCE_CONFIRMED',
          rescheduleProposedStartTime: '12:30',
          rescheduleProposedEndTime: '13:00',
        },
      ]);
      mockPrisma.notification.findFirst.mockResolvedValue({
        sentAt: oldSent,
        data: { kind: 'reservation_reschedule', reservationId: 'res-timeout' },
      });
      mockPrisma.salonSettings.findFirst.mockResolvedValue({
        maxCancellationsBeforePenalty: 3,
        penaltyDurationDays: 30,
      });
      mockPrisma.clientCancellationCount.findUnique.mockResolvedValue(null);
      mockPrisma.clientCancellationCount.upsert.mockResolvedValue({});
      mockPrisma.reservation.update.mockResolvedValue({});
      mockPrisma.reservation.findUnique.mockResolvedValue({
        id: 'res-timeout',
        confirmedStylist: { userId: 'stylist-user' },
        service: { name: 'Šišanje' },
      });

      await service.processPendingRescheduleTimeouts();

      expect(mockPrisma.reservation.update).toHaveBeenCalled();
      expect(mockPrisma.clientCancellationCount.upsert).toHaveBeenCalled();
      expect(mockNotifications.send).toHaveBeenCalled();
    });

    it('za reorder timeout ne dodaje penal i ne otkazuje rezervaciju', async () => {
      const oldSent = new Date(Date.now() - 60 * 60 * 1000);
      mockPrisma.reservation.findMany.mockResolvedValue([
        {
          id: 'res-timeout-reorder',
          clientId: 'client-1',
          serviceId: 'svc-1',
          reservationDate: new Date('2026-03-25'),
          startTime: '12:00',
          status: 'ATTENDANCE_CONFIRMED',
          rescheduleProposedStartTime: '12:30',
          rescheduleProposedEndTime: '13:00',
        },
      ]);
      mockPrisma.notification.findFirst.mockResolvedValue({
        sentAt: oldSent,
        data: {
          kind: 'reservation_reorder',
          reservationId: 'res-timeout-reorder',
        },
      });
      mockPrisma.reservation.update.mockResolvedValue({});
      mockPrisma.reservation.findUnique.mockResolvedValue({
        id: 'res-timeout-reorder',
        confirmedStylist: { userId: 'stylist-user' },
        service: { name: 'Šišanje' },
      });

      await service.processPendingRescheduleTimeouts();

      expect(mockPrisma.clientCancellationCount.upsert).not.toHaveBeenCalled();
      expect(mockPrisma.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rescheduleStatus: 'DECLINED',
          }),
        }),
      );
    });
  });

  describe('proposeReschedule', () => {
    it('manual_minutes koristi ručni unos pomaka', async () => {
      mockPrisma.stylistProfile.findUnique.mockResolvedValue({ id: 'sp-1' });
      mockPrisma.salonSettings.findFirst.mockResolvedValue({
        pauseBetweenServices: 10,
      });
      mockPrisma.reservation.findUnique.mockResolvedValue({
        id: 'res-main',
        clientId: 'client-1',
        confirmedStylistId: 'sp-1',
        reservationDate: new Date('2026-03-25'),
        startTime: '11:00',
        endTime: '11:05',
        status: 'IN_PROGRESS',
      });
      mockPrisma.reservation.findMany.mockResolvedValue([
        {
          id: 'res-future',
          clientId: 'client-2',
          startTime: '11:15',
          endTime: '11:45',
          service: { name: 'Test' },
          client: { firstName: 'A', lastName: 'B' },
        },
      ]);

      const result = await service.proposeReschedule('res-main', 'user-1', {
        includeBreaks: false,
        mode: 'manual_minutes',
        manualShiftMinutes: 8,
      });

      expect(result.delayMinutes).toBe(8);
      expect(result.items[0].newStartTime).toBe('11:23');
    });

    it('use_break_only vraća prazan proposal', async () => {
      mockPrisma.stylistProfile.findUnique.mockResolvedValue({ id: 'sp-1' });
      mockPrisma.salonSettings.findFirst.mockResolvedValue({
        pauseBetweenServices: 10,
      });
      mockPrisma.reservation.findUnique.mockResolvedValue({
        id: 'res-main',
        clientId: 'client-1',
        confirmedStylistId: 'sp-1',
        reservationDate: new Date('2026-03-25'),
        startTime: '11:00',
        endTime: '11:05',
        status: 'IN_PROGRESS',
      });

      const result = await service.proposeReschedule('res-main', 'user-1', {
        includeBreaks: false,
        mode: 'use_break_only',
      });

      expect(result.items).toEqual([]);
      expect(result.shiftMinutes).toBe(0);
    });
  });

  describe('acceptReschedule', () => {
    it('baca grešku ako postoji konflikt sa drugim terminom', async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue({
        id: 'res-1',
        clientId: 'client-1',
        confirmedStylistId: 'sp-1',
        reservationDate: new Date('2026-03-25'),
        rescheduleStatus: 'PENDING',
        rescheduleProposedStartTime: '11:30',
        rescheduleProposedEndTime: '12:00',
      });
      mockPrisma.reservation.findFirst.mockResolvedValue({ id: 'conflict-1' });

      await expect(
        service.acceptReschedule('res-1', 'client-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('requestReorder', () => {
    it('odbija reorder za različito trajanje', async () => {
      mockPrisma.stylistProfile.findUnique.mockResolvedValue({ id: 'sp-1' });
      mockPrisma.reservation.findUnique.mockResolvedValue({
        id: 'res-1',
        clientId: 'client-1',
        confirmedStylistId: 'sp-1',
        reservationDate: new Date('2026-03-25'),
        startTime: '11:00',
        endTime: '11:30',
        status: 'CONFIRMED',
        serviceId: 'svc-1',
        rescheduleStatus: null,
        rescheduleProposedStartTime: null,
        rescheduleProposedEndTime: null,
      });

      await expect(
        service.requestReorder('res-1', 'user-1', {
          targetStartTime: '12:00',
          targetEndTime: '12:45',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('autoStartUpcomingReservations', () => {
    it('auto-starta due termin kada nema aktivnog termina', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-10T10:00:00Z'));
      mockPrisma.reservation.findMany.mockResolvedValue([
        {
          id: 'res-due',
          clientId: 'client-1',
          confirmedStylistId: 'sp-1',
          reservationDate: new Date('2026-03-10T00:00:00Z'),
          startTime: '09:00',
          status: 'ATTENDANCE_CONFIRMED',
        },
      ]);
      mockPrisma.reservation.findFirst.mockResolvedValue(null);
      mockPrisma.reservation.update.mockResolvedValue({});

      await service.autoStartUpcomingReservations();

      expect(mockPrisma.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'res-due' },
          data: expect.objectContaining({ status: 'IN_PROGRESS' }),
        }),
      );
    });
  });

  describe('confirmAttendance', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('dozvoljava potvrdu dok je više od 12h do starta', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-09T20:59:59.000Z'));
      mockPrisma.reservation.findUnique.mockResolvedValue({
        id: 'res-1',
        clientId: 'client-1',
        status: 'CONFIRMED',
        reservationDate: new Date('2026-03-10T00:00:00.000Z'),
        startTime: '10:00',
        stylistResponses: [],
        confirmedStylistId: null,
        service: {},
        client: {},
        confirmedStylist: null,
        items: [],
      });
      mockPrisma.salonSettings.findFirst.mockResolvedValue({
        cancellationDeadlineHours: 24,
      });
      mockPrisma.reservation.update.mockResolvedValue({});
      const result = await service.confirmAttendance('res-1', 'client-1');
      expect(result).toMatchObject({ id: 'res-1' });
      expect(mockPrisma.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ATTENDANCE_CONFIRMED' }),
        }),
      );
    });

    it('odbija potvrdu nakon isteka 12h roka', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-09T21:00:00.000Z'));
      mockPrisma.reservation.findUnique.mockResolvedValue({
        id: 'res-1',
        clientId: 'client-1',
        status: 'CONFIRMED',
        reservationDate: new Date('2026-03-10T00:00:00.000Z'),
        startTime: '10:00',
      });
      mockPrisma.salonSettings.findFirst.mockResolvedValue({
        cancellationDeadlineHours: 24,
      });
      await expect(
        service.confirmAttendance('res-1', 'client-1'),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.reservation.update).not.toHaveBeenCalled();
    });
  });

  describe('stylistMarkComplete', () => {
    it('blokira legacy complete bez dnevne knjige', async () => {
      mockPrisma.stylistProfile.findUnique.mockResolvedValue({
        id: 'sp-1',
      });
      mockPrisma.reservation.findUnique.mockResolvedValue({
        id: 'res-1',
        confirmedStylistId: 'sp-1',
        status: 'IN_PROGRESS',
      });
      await expect(
        service.stylistMarkComplete('res-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.stylistMarkComplete('res-1', 'user-1'),
      ).rejects.toThrow(/dnevne knjige/);
      expect(mockPrisma.reservation.update).not.toHaveBeenCalled();
    });
  });

  describe('cancelByClient', () => {
    it('računa rok za otkazivanje od stvarnog starta, ne od ponoći', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-10T11:01:00.000Z'));
      mockPrisma.reservation.findUnique.mockResolvedValue({
        id: 'res-1',
        clientId: 'client-1',
        status: 'CONFIRMED',
        reservationDate: new Date('2026-03-11T00:00:00.000Z'),
        startTime: '10:00',
        serviceId: 'svc-1',
      });
      mockPrisma.salonSettings.findFirst.mockResolvedValue({
        cancellationDeadlineHours: 24,
        maxCancellationsBeforePenalty: 3,
        penaltyDurationDays: 30,
      });
      await expect(service.cancelByClient('res-1', 'client-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('processAttendanceDeadlines', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('auto-otkazuje CONFIRMED bez attendance na početku termina i primjenjuje penal', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-10T09:00:00.000Z'));
      mockPrisma.salonSettings.findFirst.mockResolvedValue({
        maxCancellationsBeforePenalty: 3,
        penaltyDurationDays: 30,
        pauseBetweenServices: 10,
        id: 'salon-1',
      });
      mockPrisma.reservation.findMany.mockResolvedValue([
        {
          id: 'res-1',
          clientId: 'client-1',
          serviceId: 'svc-1',
          reservationDate: new Date('2026-03-10T00:00:00.000Z'),
          startTime: '10:00',
          status: 'CONFIRMED',
          attendancePolicy: 'CLIENT_REQUIRED',
          confirmedStylistId: 'sp-1',
        },
      ]);
      mockPrisma.reservation.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.clientCancellationCount.findUnique.mockResolvedValue({
        userId: 'client-1',
        cancellationCount: 0,
        penaltyUntil: null,
      });
      mockPrisma.clientCancellationCount.upsert.mockResolvedValue({});
      mockPrisma.reservation.findUnique.mockResolvedValue({
        id: 'res-1',
        clientId: 'client-1',
        status: 'CANCELLED_BY_CLIENT',
        reservationDate: new Date('2026-03-10T00:00:00.000Z'),
        startTime: '10:00',
        attendancePolicy: 'CLIENT_REQUIRED',
        stylistResponses: [],
        confirmedStylistId: null,
        service: {},
        client: {},
        confirmedStylist: null,
        items: [],
      });
      const result = await service.processAttendanceDeadlines();
      expect(result).toEqual({ cancelledCount: 1 });
      expect(mockPrisma.reservation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'CANCELLED_BY_CLIENT',
            cancelReason: 'Nije potvrđen dolazak u roku',
          }),
        }),
      );
      expect(mockPrisma.clientCancellationCount.upsert).toHaveBeenCalled();
      expect(mockNotifications.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'reservation_cancelled',
          data: expect.objectContaining({
            kind: 'attendance_timeout_cancelled',
          }),
        }),
      );
    });

    it('ne otkazuje CONFIRMED prije početka termina', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-10T08:59:59.000Z'));
      mockPrisma.salonSettings.findFirst.mockResolvedValue({
        maxCancellationsBeforePenalty: 3,
        penaltyDurationDays: 30,
        id: 'salon-1',
      });
      mockPrisma.reservation.findMany.mockResolvedValue([
        {
          id: 'res-1',
          clientId: 'client-1',
          serviceId: 'svc-1',
          reservationDate: new Date('2026-03-10T00:00:00.000Z'),
          startTime: '10:00',
          status: 'CONFIRMED',
          attendancePolicy: 'CLIENT_REQUIRED',
          confirmedStylistId: 'sp-1',
        },
      ]);
      const result = await service.processAttendanceDeadlines();
      expect(result).toEqual({ cancelledCount: 0 });
      expect(mockPrisma.reservation.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('processAutoReordersAfterAttendanceCancellations', () => {
    it('predlaže raniji termin za ATTENDANCE_CONFIRMED kada postoji rupa, uz pauzu', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-10T08:00:00.000Z'));
      mockPrisma.salonSettings.findFirst.mockResolvedValue({
        id: 'salon-1',
        pauseBetweenServices: 10,
      });
      mockPrisma.reservation.findMany.mockResolvedValue([
        {
          id: 'res-1',
          clientId: 'client-1',
          confirmedStylistId: 'sp-1',
          reservationDate: new Date('2026-03-10T00:00:00.000Z'),
          startTime: '11:00',
          endTime: '11:30',
          rescheduleStatus: null,
        },
      ]);
      mockPrisma.salonWorkingHours.findUnique.mockResolvedValue({
        isWorkingDay: true,
        openTime: '09:00',
        closeTime: '17:00',
      });
      mockPrisma.reservation.updateMany.mockResolvedValue({ count: 1 });
      const result =
        await service.processAutoReordersAfterAttendanceCancellations();
      expect(result).toEqual({ proposedCount: 1 });
      expect(mockPrisma.reservation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rescheduleStatus: 'PENDING',
            rescheduleProposedStartTime: '09:10',
            rescheduleProposedEndTime: '09:40',
          }),
        }),
      );
      expect(mockNotifications.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ kind: 'reservation_reorder' }),
        }),
      );
    });
  });

  describe('stylistStart', () => {
    it('odbija start kada je prošlo plannedEnd + 60min', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-10T12:01:00.000Z'));
      mockPrisma.stylistProfile.findUnique.mockResolvedValue({
        id: 'sp-1',
        userId: 'user-1',
      });
      mockPrisma.reservation.findUnique.mockResolvedValue({
        id: 'res-1',
        clientId: 'client-1',
        confirmedStylistId: 'sp-1',
        reservationDate: new Date('2026-03-10T00:00:00.000Z'),
        startTime: '10:00',
        endTime: '11:00',
        status: 'ATTENDANCE_CONFIRMED',
        rescheduleStatus: null,
        rescheduleProposedStartTime: null,
        rescheduleProposedEndTime: null,
        serviceId: 'svc-1',
      });
      mockPrisma.reservation.findFirst.mockResolvedValue(null);
      await expect(service.stylistStart('res-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
