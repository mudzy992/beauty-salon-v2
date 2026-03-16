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

const mockPrisma = {
  reservation: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
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
};

const mockAvailability = {
  getAvailableSlots: jest.fn(),
};

const mockNotifications = {
  sendToMany: jest.fn(),
  send: jest.fn(),
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
});
