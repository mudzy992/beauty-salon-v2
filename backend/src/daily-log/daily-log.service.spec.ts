import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DailyLogService } from './daily-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { IncomeSyncService } from '../finance/income-sync.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DailyLogReceiptService } from './daily-log-receipt.service';

const mockPrisma = {
  $transaction: jest.fn(),
  clientDebt: { findMany: jest.fn(), updateMany: jest.fn() },
  dailyLogEntry: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  incomeBookManualEntry: { create: jest.fn() },
  service: { findUnique: jest.fn() },
  stylistProfile: { findUnique: jest.fn() },
  reservation: { findUnique: jest.fn() },
};

const mockIncomeSync = {
  addEntryFromDailyLog: jest.fn(),
  assertBookOpenForDate: jest.fn(),
  recalculateTotals: jest.fn(),
};

const mockReceipt = {
  notifyAfterComplete: jest.fn(),
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
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => unknown) =>
        callback(mockPrisma),
    );
    mockPrisma.dailyLogEntry.findFirst.mockResolvedValue(null);
    mockPrisma.dailyLogEntry.create.mockResolvedValue({ id: 'payment-1' });
    mockPrisma.clientDebt.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.incomeBookManualEntry.create.mockResolvedValue({ id: 'kif-1' });
    mockPrisma.service.findUnique.mockResolvedValue({ price: 30 });
    mockIncomeSync.assertBookOpenForDate.mockResolvedValue({ id: 'book-1' });
    mockIncomeSync.recalculateTotals.mockResolvedValue(undefined);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyLogService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: IncomeSyncService, useValue: mockIncomeSync },
        { provide: LoyaltyService, useValue: { earnFromDailyLog: jest.fn() } },
        { provide: NotificationsService, useValue: { send: jest.fn() } },
        { provide: DailyLogReceiptService, useValue: mockReceipt },
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
    expect(mockReceipt.notifyAfterComplete).toHaveBeenCalledWith('e1');
  });

  it('findOne baca NotFoundException kada zapis ne postoji', async () => {
    mockPrisma.dailyLogEntry.findUnique.mockResolvedValue(null);
    await expect(service.findOne('nope', user as any)).rejects.toThrow(
      NotFoundException,
    );
  });

  describe('settleDebtsAndCreateLedgerEntries', () => {
    const debt = {
      id: 'debt-1',
      clientId: 'client-1',
      stylistProfileId: 'stylist-1',
      serviceId: 'service-1',
      reservationId: null,
      dailyLogEntryId: null,
      amount: 40,
    };
    const params = {
      debtIds: ['debt-1'],
      clientId: 'client-1',
      date: new Date('2026-10-23T12:00:00.000Z'),
      sourceReservationId: 'reservation-1',
      sourceEntryId: 'source-entry-1',
      userId: 'user-1',
    };

    it('uses an OPEN-only claim scoped to the client before writing payment/KIF rows', async () => {
      mockPrisma.clientDebt.findMany.mockResolvedValue([debt]);

      await (service as any).settleDebtsAndCreateLedgerEntries(params);

      expect(mockPrisma.clientDebt.updateMany).toHaveBeenCalledWith({
        where: { id: 'debt-1', status: 'OPEN', clientId: 'client-1' },
        data: expect.objectContaining({
          status: 'SETTLED',
          settledById: 'user-1',
        }),
      });
      expect(mockPrisma.dailyLogEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          kind: 'DEBT_PAYMENT',
          debtId: 'debt-1',
          sourceEntryId: 'source-entry-1',
        }),
      });
      expect(mockPrisma.incomeBookManualEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bookId: 'book-1',
          dailyLogEntryId: 'payment-1',
          amount: 30,
          tipAmount: 10,
        }),
      });
    });

    it('conflicts and writes no payment/KIF rows if the OPEN-only claim is lost', async () => {
      mockPrisma.clientDebt.findMany.mockResolvedValue([debt]);
      mockPrisma.clientDebt.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        (service as any).settleDebtsAndCreateLedgerEntries(params),
      ).rejects.toThrow(ConflictException);
      expect(mockPrisma.dailyLogEntry.create).not.toHaveBeenCalled();
      expect(mockPrisma.incomeBookManualEntry.create).not.toHaveBeenCalled();
      expect(mockIncomeSync.recalculateTotals).not.toHaveBeenCalled();
    });
  });
});
