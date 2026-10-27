import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SalonService } from './salon.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { SOCKET_EVENTS } from '../events/socket-events';

const mockPrisma = {
  salonSettings: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  salonWorkingHours: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
  },
  holiday: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockEvents = {
  emitToAll: jest.fn(),
  emitToUser: jest.fn(),
};

describe('SalonService', () => {
  let service: SalonService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalonService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventsGateway, useValue: mockEvents },
      ],
    }).compile();

    service = module.get<SalonService>(SalonService);
  });

  it('findFirst vraća null kada nema salona', async () => {
    mockPrisma.salonSettings.findFirst.mockResolvedValue(null);
    expect(await service.findFirst()).toBeNull();
  });

  it('findOne baca NotFoundException kada salon ne postoji', async () => {
    mockPrisma.salonSettings.findUnique.mockResolvedValue(null);
    await expect(service.findOne('non-existent')).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.findOne('non-existent')).rejects.toThrow(
      'Salon nije pronađen.',
    );
  });

  it('broadcasts only a salon invalidation instead of holiday metadata', async () => {
    const updated = {
      id: 'salon-1',
      name: 'Salon',
      workingHours: [],
      holidays: [
        {
          id: 'holiday-1',
          name: 'Holiday',
          sendPush: true,
          pushSentAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
    };
    mockPrisma.salonSettings.findUnique.mockResolvedValue(updated);
    mockPrisma.salonSettings.update.mockResolvedValue(updated);

    await service.update('salon-1', { name: 'Updated salon' });
    expect(mockEvents.emitToAll).toHaveBeenCalledTimes(1);
    expect(mockEvents.emitToAll).toHaveBeenCalledWith(
      SOCKET_EVENTS.SALON_UPDATED,
      { key: 'salon' },
    );
  });

  it('setWorkingHours briše stare i kreira nove sate', async () => {
    const salonId = 'salon-1';
    mockPrisma.salonSettings.findUnique.mockResolvedValue({ id: salonId });
    mockPrisma.salonWorkingHours.deleteMany.mockResolvedValue({ count: 2 });
    mockPrisma.salonWorkingHours.createMany.mockResolvedValue({ count: 2 });
    mockPrisma.salonWorkingHours.findMany.mockResolvedValue([
      { dayOfWeek: 1, openTime: '09:00', closeTime: '17:00' },
      { dayOfWeek: 2, openTime: '09:00', closeTime: '17:00' },
    ]);

    const result = await service.setWorkingHours(salonId, [
      { dayOfWeek: 1, openTime: '09:00', closeTime: '17:00' },
      { dayOfWeek: 2, openTime: '09:00', closeTime: '17:00' },
    ]);

    expect(mockPrisma.salonWorkingHours.deleteMany).toHaveBeenCalledWith({
      where: { salonSettingsId: salonId },
    });
    expect(mockPrisma.salonWorkingHours.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          dayOfWeek: 1,
          openTime: '09:00',
          closeTime: '17:00',
        }),
        expect.objectContaining({
          dayOfWeek: 2,
          openTime: '09:00',
          closeTime: '17:00',
        }),
      ]),
    });
    expect(result).toHaveLength(2);
  });
});
