import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { HolidayNotificationsService } from './holiday-notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const mockPrisma = {
  holiday: { findUnique: jest.fn(), update: jest.fn() },
  user: { findMany: jest.fn() },
};

const mockNotifications = { send: jest.fn() };

describe('HolidayNotificationsService', () => {
  let service: HolidayNotificationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HolidayNotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();
    service = module.get<HolidayNotificationsService>(
      HolidayNotificationsService,
    );
  });

  it('sendForHoliday baca NotFoundException kada praznik ne postoji', async () => {
    mockPrisma.holiday.findUnique.mockResolvedValue(null);
    await expect(service.sendForHoliday('nope')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('sendForHoliday baca BadRequestException kada sendPush je false', async () => {
    mockPrisma.holiday.findUnique.mockResolvedValue({
      id: 'h1',
      name: 'Praznik',
      message: 'Poruka',
      sendPush: false,
      pushSentAt: null,
    });
    await expect(service.sendForHoliday('h1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('sendForHoliday baca BadRequestException kada je pushSentAt već postavljen', async () => {
    mockPrisma.holiday.findUnique.mockResolvedValue({
      id: 'h1',
      name: 'Praznik',
      sendPush: true,
      pushSentAt: new Date(),
    });
    await expect(service.sendForHoliday('h1')).rejects.toThrow(
      BadRequestException,
    );
  });
});
