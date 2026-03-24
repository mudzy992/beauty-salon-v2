import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { AvailabilityService } from './availability.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { LoyaltyService } from '../loyalty/loyalty.service';

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

const mockPrisma = {
  reservation: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
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
  clientCancellationCount: { findUnique: jest.fn(), upsert: jest.fn() },
  $transaction: jest.fn(async (cb: any) => (typeof cb === 'function' ? cb(mockPrisma) : undefined)),
};

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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AvailabilityService, useValue: mockAvailability },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: EventsGateway, useValue: mockEvents },
        { provide: LoyaltyService, useValue: mockLoyalty },
      ],
    }).compile();
    service = module.get<ReservationsService>(ReservationsService);
  });

  describe('create', () => {
    it('baca BadRequestException kada termin nije dostupan', async () => {
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
      mockPrisma.clientCancellationCount.findUnique.mockResolvedValue(null);
      mockAvailability.getAvailableSlots.mockResolvedValue([
        { startTime: '09:00', endTime: '10:00', availableStylistCount: 2 },
      ]);
      mockPrisma.reservation.create.mockResolvedValue({
        id: 'res-1',
        clientId: 'client-1',
        serviceId: 'svc-1',
        status: 'PENDING',
        service: { name: 'Šišanje' },
        client: { id: 'c1', firstName: 'A', lastName: 'B', email: 'a@b.com' },
      });
      mockPrisma.stylistService.findMany.mockResolvedValue([
        { stylistProfileId: 'sp1' },
        { stylistProfileId: 'sp2' },
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
          rescheduleProposedStartTime: '12:30',
          rescheduleProposedEndTime: '13:00',
        },
      ]);
      mockPrisma.notification.findFirst.mockResolvedValue({
        sentAt: oldSent,
        data: { kind: 'reservation_reorder', reservationId: 'res-timeout-reorder' },
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
      mockPrisma.salonSettings.findFirst.mockResolvedValue({ pauseBetweenServices: 10 });
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
      mockPrisma.salonSettings.findFirst.mockResolvedValue({ pauseBetweenServices: 10 });
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

      await expect(service.acceptReschedule('res-1', 'client-1')).rejects.toThrow(
        BadRequestException,
      );
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
      mockPrisma.reservation.findMany.mockResolvedValue([
        {
          id: 'res-due',
          clientId: 'client-1',
          confirmedStylistId: 'sp-1',
          reservationDate: new Date(),
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
});
