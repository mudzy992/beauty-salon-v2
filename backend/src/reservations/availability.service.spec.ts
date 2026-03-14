import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  salonSettings: { findFirst: jest.fn() },
  service: { findUnique: jest.fn() },
  stylistService: { findMany: jest.fn() },
  holiday: { findFirst: jest.fn() },
  salonWorkingHours: { findUnique: jest.fn() },
  stylistWorkingHours: { findFirst: jest.fn() },
  stylistProfile: { findMany: jest.fn() },
  reservation: { findMany: jest.fn() },
};

describe('AvailabilityService', () => {
  let service: AvailabilityService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<AvailabilityService>(AvailabilityService);
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
    mockPrisma.service.findUnique.mockResolvedValue(null);
    await expect(
      service.getAvailableDates('svc-1', new Date('2026-03-15')),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.getAvailableDates('svc-1', new Date('2026-03-15')),
    ).rejects.toThrow('Servis nije pronađen');
  });

  it('getAvailableDates vraća prazan niz kada nema stilista za servis', async () => {
    mockPrisma.salonSettings.findFirst.mockResolvedValue({ id: 'salon-1' });
    mockPrisma.service.findUnique.mockResolvedValue({ id: 'svc-1' });
    mockPrisma.stylistService.findMany.mockResolvedValue([]);
    const result = await service.getAvailableDates(
      'svc-1',
      new Date('2026-03-15'),
    );
    expect(result).toEqual([]);
  });

  it('getAvailableSlots baca NotFoundException kada nema salona', async () => {
    mockPrisma.salonSettings.findFirst.mockResolvedValue(null);
    await expect(
      service.getAvailableSlots('svc-1', '2026-03-15'),
    ).rejects.toThrow(NotFoundException);
  });

  it('getAvailableSlots vraća prazan niz za praznik', async () => {
    mockPrisma.salonSettings.findFirst.mockResolvedValue({ id: 'salon-1' });
    mockPrisma.service.findUnique.mockResolvedValue({
      id: 'svc-1',
      durationMinutes: 60,
    });
    mockPrisma.holiday.findFirst.mockResolvedValue({ id: 'h1' });
    const result = await service.getAvailableSlots('svc-1', '2026-03-15');
    expect(result).toEqual([]);
  });

  it('getAvailableSlots vraća prazan niz kada salon ne radi taj dan', async () => {
    mockPrisma.salonSettings.findFirst.mockResolvedValue({
      id: 'salon-1',
      pauseBetweenServices: 10,
    });
    mockPrisma.service.findUnique.mockResolvedValue({
      id: 'svc-1',
      durationMinutes: 60,
    });
    mockPrisma.holiday.findFirst.mockResolvedValue(null);
    mockPrisma.salonWorkingHours.findUnique.mockResolvedValue(null);
    const result = await service.getAvailableSlots('svc-1', '2026-03-15');
    expect(result).toEqual([]);
  });
});
