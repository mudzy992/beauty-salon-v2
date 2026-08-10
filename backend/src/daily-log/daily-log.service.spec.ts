import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DailyLogService } from './daily-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { IncomeSyncService } from '../finance/income-sync.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { NotificationsService } from '../notifications/notifications.service';

const mockPrisma = {
  dailyLogEntry: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  stylistProfile: { findUnique: jest.fn() },
  reservation: { findUnique: jest.fn() },
};

const mockIncomeSync = {
  addEntryFromDailyLog: jest.fn(),
};

describe('DailyLogService', () => {
  let service: DailyLogService;

  const user = {
    sub: 'user-1',
    username: 'u',
    email: 'e@e.com',
    roles: ['STYLIST'],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyLogService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: IncomeSyncService, useValue: mockIncomeSync },
        { provide: LoyaltyService, useValue: { earnFromDailyLog: jest.fn() } },
        { provide: NotificationsService, useValue: { send: jest.fn() } },
      ],
    }).compile();
    service = module.get<DailyLogService>(DailyLogService);
  });

  it('create baca ForbiddenException kada user nije stilist tog profila', async () => {
    mockPrisma.stylistProfile.findUnique.mockResolvedValue({
      userId: 'other-user',
    });
    await expect(
      service.create(
        {
          stylistProfileId: 'sp-1',
          serviceId: 'svc-1',
          date: '2026-03-20',
          actualPrice: 50,
        } as any,
        user as any,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('complete poziva incomeBooks.addEntryFromDailyLog', async () => {
    mockIncomeSync.addEntryFromDailyLog.mockResolvedValue(undefined);
    const entry = {
      id: 'e1',
      stylistProfileId: 'sp-1',
      status: 'PENDING',
      stylistProfile: { userId: 'user-1' },
      service: {},
      client: null,
      reservation: null,
      images: [],
    };
    mockPrisma.dailyLogEntry.findUnique.mockResolvedValue(entry);
    mockPrisma.stylistProfile.findUnique.mockResolvedValue({
      userId: 'user-1',
    });
    mockPrisma.dailyLogEntry.update.mockResolvedValue({
      ...entry,
      status: 'COMPLETED',
    });
    await service.complete('e1', user as any);
    expect(mockIncomeSync.addEntryFromDailyLog).toHaveBeenCalledWith('e1');
  });

  it('findOne baca NotFoundException kada zapis ne postoji', async () => {
    mockPrisma.dailyLogEntry.findUnique.mockResolvedValue(null);
    await expect(service.findOne('nope', user as any)).rejects.toThrow(
      NotFoundException,
    );
  });
});
