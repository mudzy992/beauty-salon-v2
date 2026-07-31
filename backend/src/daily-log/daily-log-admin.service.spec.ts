import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DailyLogAdminService } from './daily-log-admin.service';
import { DailyLogService } from './daily-log.service';
import { DailyLogReversalService } from './daily-log-reversal.service';
import { DailyLogValidators } from './daily-log.validators';
import { PrismaService } from '../prisma/prisma.service';
import { IncomeSyncService } from '../finance/income-sync.service';
import { LoyaltyService } from '../loyalty/loyalty.service';

describe('DailyLogAdminService', () => {
  let service: DailyLogAdminService;
  const mockDailyLog = {
    findOne: jest.fn(),
    isAdminOrOwner: jest.fn(),
    ensureStylistAccess: jest.fn(),
    entryInclude: jest.fn(() => ({})),
    complete: jest.fn(),
  };
  const mockReversal = {
    reverseCompletedEffects: jest.fn(),
    syncIncomeBookEntry: jest.fn(),
    recalcInTx: jest.fn(),
  };
  const mockValidators = {
    parseDate: jest.fn((v: string) => new Date(v)),
    normalizeServiceIds: jest.fn((ids: string[]) => ids),
    assertClientServiceGenderMatch: jest.fn(),
  };
  const mockPrisma: Record<string, any> = {
    dailyLogEntry: {
      update: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    dailyLogEntryServiceItem: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    dailyLogImage: {
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(async (fn: any) => fn(mockPrisma)),
    incomeBookManualEntry: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn(),
    },
    clientDebt: { update: jest.fn() },
  };
  const mockIncomeSync = {
    assertBookOpenForDate: jest.fn(),
  };
  const mockLoyalty = {
    redeemForDailyLog: jest.fn(),
  };

  const admin = {
    sub: 'admin-1',
    username: 'admin',
    email: 'a@a.com',
    roles: ['SYSTEM_ADMIN'],
  };
  const stylist = {
    sub: 'stylist-1',
    username: 's',
    email: 's@s.com',
    roles: ['STYLIST'],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDailyLog.isAdminOrOwner.mockImplementation(
      (u: { roles: string[] }) =>
        u.roles.includes('SYSTEM_ADMIN') || u.roles.includes('OWNER'),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyLogAdminService,
        { provide: DailyLogService, useValue: mockDailyLog },
        { provide: DailyLogReversalService, useValue: mockReversal },
        { provide: DailyLogValidators, useValue: mockValidators },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: IncomeSyncService, useValue: mockIncomeSync },
        { provide: LoyaltyService, useValue: mockLoyalty },
      ],
    }).compile();
    service = module.get(DailyLogAdminService);
  });

  it('softDelete requires reason for admin', async () => {
    mockDailyLog.findOne.mockResolvedValue({
      id: 'e1',
      status: 'PENDING',
      kind: 'SERVICE',
      date: new Date(),
    });
    await expect(
      service.softDelete('e1', {}, admin as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('softDelete reverses completed effects for admin', async () => {
    mockDailyLog.findOne.mockResolvedValue({
      id: 'e1',
      status: 'COMPLETED',
      kind: 'SERVICE',
      date: new Date(),
    });
    mockPrisma.dailyLogEntry.update.mockResolvedValue({ id: 'e1', deletedAt: new Date() });
    await service.softDelete('e1', { reason: 'Greška' }, admin as any);
    expect(mockReversal.reverseCompletedEffects).toHaveBeenCalledWith('e1');
    expect(mockPrisma.dailyLogEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          deleteReason: 'Greška',
          deletedById: 'admin-1',
        }),
      }),
    );
  });

  it('stylist cannot delete COMPLETED entry', async () => {
    mockDailyLog.findOne.mockResolvedValue({
      id: 'e1',
      status: 'COMPLETED',
      kind: 'SERVICE',
      date: new Date(),
    });
    await expect(
      service.softDelete('e1', {}, stylist as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('revertToPending calls reverseCompletedEffects', async () => {
    mockDailyLog.findOne.mockResolvedValue({
      id: 'e1',
      status: 'COMPLETED',
      date: new Date(),
    });
    mockPrisma.dailyLogEntry.update.mockResolvedValue({
      id: 'e1',
      status: 'PENDING',
    });
    await service.revertToPending('e1', admin as any);
    expect(mockReversal.reverseCompletedEffects).toHaveBeenCalledWith('e1');
  });

  it('stylist cannot add image to COMPLETED entry', async () => {
    mockDailyLog.findOne.mockResolvedValue({
      id: 'e1',
      status: 'COMPLETED',
    });
    await expect(
      service.addImage('e1', { uploadId: 'u1', isBefore: true }, stylist as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('admin can add image to COMPLETED entry', async () => {
    mockDailyLog.findOne.mockResolvedValue({
      id: 'e1',
      status: 'COMPLETED',
    });
    mockPrisma.dailyLogImage.create.mockResolvedValue({ id: 'img1' });
    await service.addImage(
      'e1',
      { uploadId: 'u1', isBefore: true },
      admin as any,
    );
    expect(mockPrisma.dailyLogImage.create).toHaveBeenCalled();
  });
});
