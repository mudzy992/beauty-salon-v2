import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { AvailabilityDatesService } from './availability-dates.service';
import { AvailabilitySlotsService } from './availability-slots.service';
import { AvailabilityDebugService } from './availability-debug.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

const mockPrisma = {
  salonSettings: { findFirst: jest.fn() },
  service: { findUnique: jest.fn(), findMany: jest.fn() },
  stylistService: { findMany: jest.fn() },
  holiday: { findFirst: jest.fn(), findMany: jest.fn() },
  salonWorkingHours: { findUnique: jest.fn(), findMany: jest.fn() },
  stylistWorkingHours: { findFirst: jest.fn(), findMany: jest.fn() },
  stylistProfile: { findMany: jest.fn() },
  reservation: { findMany: jest.fn() },
};

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let slotsService: AvailabilitySlotsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        AvailabilityDatesService,
        AvailabilitySlotsService,
        AvailabilityDebugService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<AvailabilityService>(AvailabilityService);
    slotsService = module.get<AvailabilitySlotsService>(
      AvailabilitySlotsService,
    );
  });

  it('odbija neispravan fromDate prije poziva baze', async () => {
    await expect(
      service.getAvailableDates('svc-1', new Date('not-a-date')),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.salonSettings.findFirst).not.toHaveBeenCalled();
  });

  it('odbija neispravan toDate prije poziva baze', async () => {
    await expect(
      service.getAvailableDates(
        'svc-1',
        new Date('2026-01-01T12:00:00.000Z'),
        new Date('not-a-date'),
      ),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.salonSettings.findFirst).not.toHaveBeenCalled();
  });

  it('odbija obrnut opseg prije poziva baze', async () => {
    await expect(
      service.getAvailableDates(
        'svc-1',
        new Date('2026-01-02T12:00:00.000Z'),
        new Date('2026-01-01T12:00:00.000Z'),
      ),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.salonSettings.findFirst).not.toHaveBeenCalled();
  });

  it('odbija opseg duži od 90 kalendarskih dana prije poziva baze', async () => {
    await expect(
      service.getAvailableDates(
        'svc-1',
        new Date('2026-01-01T12:00:00.000Z'),
        new Date('2026-04-01T12:00:00.000Z'),
      ),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.salonSettings.findFirst).not.toHaveBeenCalled();
  });

  it('uključuje završni dan u jednodnevnom date-only opsegu', async () => {
    mockPrisma.salonSettings.findFirst.mockResolvedValue({ id: 'salon-1' });
    mockPrisma.service.findMany.mockResolvedValue([{ id: 'svc-1' }]);
    mockPrisma.salonWorkingHours.findMany.mockResolvedValue([]);
    mockPrisma.holiday.findMany.mockResolvedValue([]);
    mockPrisma.stylistService.findMany.mockResolvedValue([]);

    const result = await service.getAvailableDates(
      'svc-1',
      new Date('2026-03-15'),
      new Date('2026-03-15'),
    );

    expect(result).toHaveLength(1);
    expect(result[0].available).toBe(false);
  });

  it('ne dopušta da godine ispod 100 zaobiđu range cap', async () => {
    await expect(
      service.getAvailableDates(
        'svc-1',
        new Date('0001-01-01T12:00:00.000Z'),
        new Date('1901-01-01T12:00:00.000Z'),
      ),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.salonSettings.findFirst).not.toHaveBeenCalled();
  });

  it('prihvata 90-dnevni opseg i vraća bounded listu', async () => {
    mockPrisma.salonSettings.findFirst.mockResolvedValue({ id: 'salon-1' });
    mockPrisma.service.findMany.mockResolvedValue([{ id: 'svc-1' }]);
    mockPrisma.salonWorkingHours.findMany.mockResolvedValue([]);
    mockPrisma.holiday.findMany.mockResolvedValue([]);
    mockPrisma.stylistService.findMany.mockResolvedValue([]);

    const result = await service.getAvailableDates(
      'svc-1',
      new Date('2026-01-01T12:00:00.000Z'),
      new Date('2026-03-31T12:00:00.000Z'),
    );

    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(90);
  });

  it('ograničava broj paralelnih provjera slotova na jedan zahtjev', async () => {
    mockPrisma.salonSettings.findFirst.mockResolvedValue({ id: 'salon-1' });
    mockPrisma.service.findMany.mockResolvedValue([{ id: 'svc-1' }]);
    mockPrisma.salonWorkingHours.findMany.mockResolvedValue(
      Array.from({ length: 7 }, (_, dayOfWeek) => ({
        dayOfWeek,
        isWorkingDay: true,
      })),
    );
    mockPrisma.holiday.findMany.mockResolvedValue([]);
    mockPrisma.stylistService.findMany.mockResolvedValue([
      { stylistProfileId: 'sp-1', serviceId: 'svc-1' },
    ]);
    mockPrisma.stylistWorkingHours.findMany.mockResolvedValue(
      Array.from({ length: 7 }, (_, dayOfWeek) => ({
        dayOfWeek,
        dateOverride: null,
      })),
    );

    let activeLookups = 0;
    let maximumConcurrentLookups = 0;
    const slotsSpy = jest
      .spyOn(slotsService, 'getAvailableSlots')
      .mockImplementation(async () => {
        activeLookups++;
        maximumConcurrentLookups = Math.max(
          maximumConcurrentLookups,
          activeLookups,
        );
        try {
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
          return [
            {
              startTime: '09:00',
              endTime: '10:00',
              availableStylistCount: 1,
            },
          ];
        } finally {
          activeLookups--;
        }
      });

    try {
      const result = await service.getAvailableDates(
        'svc-1',
        new Date('2026-01-01T12:00:00.000Z'),
        new Date('2026-01-12T12:00:00.000Z'),
      );

      expect(result).toHaveLength(12);
      expect(result.every((row) => row.available)).toBe(true);
      expect(slotsSpy).toHaveBeenCalledTimes(12);
      expect(maximumConcurrentLookups).toBeGreaterThan(1);
      expect(maximumConcurrentLookups).toBeLessThanOrEqual(5);
    } finally {
      slotsSpy.mockRestore();
    }
  });

  it('getAvailableDates baca NotFoundException kada nema salona', async () => {
    mockPrisma.salonSettings.findFirst.mockResolvedValue(null);
    await expect(
      service.getAvailableDates('svc-1', new Date('2026-03-15')),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.getAvailableDates('svc-1', new Date('2026-03-15')),
    ).rejects.toThrow('Salon nije konfigurisan');
  });

  it('getAvailableDates baca NotFoundException kada servis ne postoji', async () => {
    mockPrisma.salonSettings.findFirst.mockResolvedValue({ id: 'salon-1' });
    mockPrisma.service.findMany.mockResolvedValue([]);
    await expect(
      service.getAvailableDates('svc-1', new Date('2026-03-15')),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.getAvailableDates('svc-1', new Date('2026-03-15')),
    ).rejects.toThrow('Servis nije pronađen');
  });

  it('getAvailableDates vraća prazan niz kada nema stilista za servis', async () => {
    mockPrisma.salonSettings.findFirst.mockResolvedValue({ id: 'salon-1' });
    mockPrisma.service.findMany.mockResolvedValue([{ id: 'svc-1' }]);
    mockPrisma.salonWorkingHours.findMany.mockResolvedValue([]);
    mockPrisma.holiday.findMany.mockResolvedValue([]);
    mockPrisma.stylistService.findMany.mockResolvedValue([]);
    const result = await service.getAvailableDates(
      'svc-1',
      new Date('2026-03-15'),
    );
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((d) => d.available === false)).toBe(true);
  });

  it('getAvailableSlots baca NotFoundException kada nema salona', async () => {
    mockPrisma.salonSettings.findFirst.mockResolvedValue(null);
    await expect(
      service.getAvailableSlots('svc-1', '2026-03-15'),
    ).rejects.toThrow(NotFoundException);
  });

  it('getAvailableSlots vraća prazan niz za praznik', async () => {
    mockPrisma.salonSettings.findFirst.mockResolvedValue({ id: 'salon-1' });
    mockPrisma.service.findMany.mockResolvedValue([
      { id: 'svc-1', durationMinutes: 60 },
    ]);
    mockPrisma.salonWorkingHours.findMany.mockResolvedValue([
      {
        dayOfWeek: 0,
        isWorkingDay: true,
        openTime: '09:00',
        closeTime: '17:00',
      },
    ]);
    mockPrisma.stylistService.findMany.mockResolvedValue([]);
    mockPrisma.holiday.findMany.mockResolvedValue([{ id: 'h1' }]);
    mockPrisma.holiday.findFirst.mockResolvedValue({ id: 'h1' });
    const result = await service.getAvailableSlots('svc-1', '2026-03-15');
    expect(result).toEqual([]);
  });

  it('getAvailableSlots vraća prazan niz kada salon ne radi taj dan', async () => {
    mockPrisma.salonSettings.findFirst.mockResolvedValue({
      id: 'salon-1',
      pauseBetweenServices: 10,
    });
    mockPrisma.service.findMany.mockResolvedValue([
      { id: 'svc-1', durationMinutes: 60 },
    ]);
    mockPrisma.holiday.findMany.mockResolvedValue([]);
    mockPrisma.holiday.findFirst.mockResolvedValue(null);
    mockPrisma.salonWorkingHours.findUnique.mockResolvedValue(null);
    mockPrisma.salonWorkingHours.findMany.mockResolvedValue([]);
    mockPrisma.stylistService.findMany.mockResolvedValue([]);
    const result = await service.getAvailableSlots('svc-1', '2026-03-15');
    expect(result).toEqual([]);
  });

  it('CONFIRMED reservation blocks slot (availableStylistCount=0)', async () => {
    mockPrisma.salonSettings.findFirst.mockResolvedValue({
      id: 'salon-1',
      pauseBetweenServices: 0,
    });
    mockPrisma.service.findMany.mockResolvedValue([
      { id: 'svc-1', durationMinutes: 60 },
    ]);
    mockPrisma.holiday.findMany.mockResolvedValue([]);
    mockPrisma.salonWorkingHours.findUnique.mockResolvedValue({
      isWorkingDay: true,
      openTime: '09:00',
      closeTime: '11:00',
    });
    mockPrisma.stylistService.findMany.mockResolvedValue([
      { stylistProfileId: 'sp-1', serviceId: 'svc-1' },
    ]);
    mockPrisma.stylistProfile.findMany.mockResolvedValue([
      {
        id: 'sp-1',
        isActive: true,
        workingHours: [
          {
            dayOfWeek: 1,
            isWorkingDay: true,
            startTime: '09:00',
            endTime: '11:00',
            dateOverride: null,
          },
        ],
      },
    ]);
    mockPrisma.reservation.findMany.mockResolvedValue([
      {
        startTime: '09:00',
        endTime: '10:00',
        status: 'CONFIRMED',
        confirmedStylistId: 'sp-1',
        stylistResponses: [],
      },
    ]);
    const result = await service.getAvailableSlots('svc-1', '2026-03-16');
    const blocked = result.find((s) => s.startTime === '09:00');
    expect(blocked).toBeUndefined();
    const allStarts = result.map((s) => s.startTime);
    expect(allStarts).not.toContain('09:00');
  });

  it('PENDING hold s 1 stilistom vraća slot kao pending_hold', async () => {
    mockPrisma.salonSettings.findFirst.mockResolvedValue({
      id: 'salon-1',
      pauseBetweenServices: 0,
    });
    mockPrisma.service.findMany.mockResolvedValue([
      { id: 'svc-1', durationMinutes: 60 },
    ]);
    mockPrisma.holiday.findMany.mockResolvedValue([]);
    mockPrisma.salonWorkingHours.findUnique.mockResolvedValue({
      isWorkingDay: true,
      openTime: '09:00',
      closeTime: '11:00',
    });
    mockPrisma.stylistService.findMany.mockResolvedValue([
      { stylistProfileId: 'sp-1', serviceId: 'svc-1' },
    ]);
    mockPrisma.stylistProfile.findMany.mockResolvedValue([
      {
        id: 'sp-1',
        isActive: true,
        workingHours: [
          {
            dayOfWeek: 1,
            isWorkingDay: true,
            startTime: '09:00',
            endTime: '11:00',
            dateOverride: null,
          },
        ],
      },
    ]);
    mockPrisma.reservation.findMany.mockResolvedValue([
      {
        startTime: '09:00',
        endTime: '10:00',
        status: 'PENDING',
        confirmedStylistId: null,
        stylistResponses: [
          { stylistProfileId: 'sp-1', status: 'PENDING', lockExpiresAt: null },
        ],
      },
    ]);
    const result = await service.getAvailableSlots('svc-1', '2026-03-16');
    const held = result.find((s) => s.startTime === '09:00');
    expect(held?.availableStylistCount).toBe(0);
    expect(held?.holdState).toBe('pending_hold');
  });

  it('getAvailableDates honesty: dan bez slotova nije available', async () => {
    mockPrisma.salonSettings.findFirst.mockResolvedValue({ id: 'salon-1' });
    mockPrisma.service.findMany.mockResolvedValue([{ id: 'svc-1' }]);
    mockPrisma.salonWorkingHours.findMany.mockResolvedValue([
      {
        dayOfWeek: 1,
        isWorkingDay: true,
        openTime: '09:00',
        closeTime: '17:00',
      },
    ]);
    mockPrisma.holiday.findMany.mockResolvedValue([]);
    mockPrisma.stylistService.findMany.mockResolvedValue([
      { stylistProfileId: 'sp-1', serviceId: 'svc-1' },
    ]);
    mockPrisma.stylistWorkingHours.findMany.mockResolvedValue([
      { dayOfWeek: 1, dateOverride: null },
    ]);
    const slotsSpy = jest
      .spyOn(slotsService, 'getAvailableSlots')
      .mockResolvedValue([]);
    const result = await service.getAvailableDates(
      'svc-1',
      new Date('2026-03-16T12:00:00.000Z'),
      new Date('2026-03-16T12:00:00.000Z'),
    );
    expect(slotsSpy).toHaveBeenCalled();
    expect(result).toEqual([{ date: expect.any(String), available: false }]);
    slotsSpy.mockRestore();
  });
});
