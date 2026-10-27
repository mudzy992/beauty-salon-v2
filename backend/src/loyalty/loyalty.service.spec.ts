import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

const mockPrisma = {
  $transaction: jest.fn(),
  loyaltyAccount: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
  },
  loyaltyTransaction: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    groupBy: jest.fn(),
    create: jest.fn(),
  },
  reservation: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  dailyLogEntry: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  service: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  $queryRaw: jest.fn().mockResolvedValue([]),
  appSetting: {
    findMany: jest.fn(),
  },
};

const mockSettings = {
  getValue: jest.fn(),
};

const configureStatefulLoyaltyStore = (startingPoints = 100) => {
  const account = {
    id: 'acc1',
    userId: 'u1',
    points: startingPoints,
    isActive: true,
    tier: null as string | null,
  };
  const transactions: Array<Record<string, any>> = [];
  mockPrisma.loyaltyAccount.findUnique.mockImplementation(async () => ({
    ...account,
  }));
  mockPrisma.loyaltyAccount.updateMany.mockImplementation(
    async ({ where, data }: any) => {
      if (where.id !== account.id || where.points !== account.points) {
        return { count: 0 };
      }
      if (data.points?.set != null) account.points = data.points.set;
      return { count: 1 };
    },
  );
  mockPrisma.loyaltyAccount.update.mockImplementation(async ({ data }: any) => {
    if (data.tier !== undefined) account.tier = data.tier;
    return { ...account };
  });
  mockPrisma.loyaltyTransaction.findUnique.mockImplementation(
    async ({ where }: any) =>
      transactions.find(
        (transaction) => transaction.idempotencyKey === where.idempotencyKey,
      ) ?? null,
  );
  mockPrisma.loyaltyTransaction.create.mockImplementation(
    async ({ data }: any) => {
      const transaction = { id: `txn-${transactions.length + 1}`, ...data };
      transactions.push(transaction);
      return transaction;
    },
  );
  mockPrisma.loyaltyTransaction.findMany.mockImplementation(async () => []);

  return { account, transactions };
};

describe('LoyaltyService', () => {
  let service: LoyaltyService;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => unknown) =>
        callback(mockPrisma),
    );
    mockPrisma.$queryRaw.mockResolvedValue([]);
    mockPrisma.loyaltyAccount.findMany.mockResolvedValue([]);
    mockPrisma.loyaltyTransaction.findUnique.mockResolvedValue(null);
    mockPrisma.loyaltyTransaction.findMany.mockResolvedValue([]);
    mockPrisma.loyaltyTransaction.groupBy.mockResolvedValue([]);
    mockPrisma.reservation.findMany.mockResolvedValue([]);
    mockPrisma.dailyLogEntry.findMany.mockResolvedValue([]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SettingsService, useValue: mockSettings },
      ],
    }).compile();
    service = module.get<LoyaltyService>(LoyaltyService);
  });

  describe('earnFromDailyLog', () => {
    it('vraca null kada je program iskljucen', async () => {
      mockSettings.getValue.mockResolvedValueOnce('false');
      const result = await service.earnFromDailyLog({
        id: 'e1',
        clientId: 'u1',
        actualPrice: 50,
        tipAmount: 0,
        serviceId: 'svc1',
      });
      expect(result).toBeNull();
    });

    it('dodjeljuje bodove kada su uslovi ispunjeni', async () => {
      mockSettings.getValue
        .mockResolvedValueOnce('true') // loyalty_enabled
        .mockResolvedValueOnce('1') // loyalty_points_per_currency
        .mockResolvedValueOnce('false') // loyalty_earn_on_tip
        .mockResolvedValueOnce('0') // loyalty_min_amount_for_earn
        .mockResolvedValueOnce('[]'); // loyalty_excluded_services

      mockPrisma.loyaltyAccount.upsert.mockResolvedValue({ id: 'acc1' });
      const accountState = {
        id: 'acc1',
        userId: 'u1',
        points: 0,
        isActive: true,
        tier: null as string | null,
      };
      mockPrisma.loyaltyAccount.findUnique.mockImplementation(async () => ({
        ...accountState,
      }));
      mockPrisma.loyaltyAccount.updateMany.mockImplementation(
        async ({ data }: any) => {
          accountState.points = data.points.set;
          return { count: 1 };
        },
      );
      mockPrisma.loyaltyAccount.update.mockImplementation(
        async ({ data }: any) => {
          accountState.tier = data.tier;
          return { ...accountState };
        },
      );
      mockPrisma.loyaltyTransaction.create.mockResolvedValue({ id: 'earn-1' });

      const result = await service.earnFromDailyLog({
        id: 'e1',
        clientId: 'u1',
        actualPrice: 50,
        tipAmount: 0,
        serviceId: 'svc1',
      });

      expect(result).toMatchObject({ id: 'acc1', points: 50 });
      expect(mockPrisma.loyaltyAccount.updateMany).toHaveBeenCalledWith({
        where: { id: 'acc1', points: 0 },
        data: { points: { set: 50 } },
      });
      expect(mockPrisma.loyaltyTransaction.create).toHaveBeenCalledWith({
        data: {
          accountId: 'acc1',
          points: 50,
          type: 'EARN',
          source: 'daily_log:e1',
          idempotencyKey: 'daily-log.earn:e1:v1',
        },
      });
      expect(mockPrisma.loyaltyAccount.update).toHaveBeenCalled();
      expect(mockPrisma.loyaltyAccount.upsert).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        create: { userId: 'u1', isActive: true },
        update: {},
        select: { id: true },
      });
    });

    it('ne ponavlja earn kada isti completion idempotency key već postoji', async () => {
      mockPrisma.loyaltyTransaction.findUnique.mockResolvedValue({
        id: 'txn1',
        accountId: 'acc1',
        points: 50,
        type: 'EARN',
        source: 'daily_log:e1',
      });
      mockPrisma.loyaltyAccount.findUnique.mockResolvedValue({
        id: 'acc1',
        userId: 'u1',
        points: 50,
      });

      const result = await service.earnFromDailyLog({
        id: 'e1',
        clientId: 'u1',
        actualPrice: 50,
        tipAmount: 0,
        serviceId: 'svc1',
        idempotencyKey: 'daily-log.earn:e1:v1',
      });

      expect(result).toMatchObject({ id: 'acc1', points: 50 });
      expect(mockPrisma.loyaltyTransaction.findUnique).toHaveBeenCalledWith({
        where: { idempotencyKey: 'daily-log.earn:e1:v1' },
      });
      expect(mockPrisma.loyaltyAccount.update).not.toHaveBeenCalled();
      expect(mockSettings.getValue).not.toHaveBeenCalled();
    });
  });

  describe('redeemForReservation', () => {
    it('reports a conflict when a reservation marker has no matching ledger row', async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue({
        id: 'res1',
        clientId: 'u1',
        loyaltyPointsUsed: 10,
      });
      mockPrisma.loyaltyAccount.findUnique.mockResolvedValue({
        id: 'acc1',
        userId: 'u1',
        points: 100,
        isActive: true,
      });

      await expect(
        service.redeemForReservation(
          {
            clientId: 'u1',
            reservationId: 'res1',
            serviceId: 'svc1',
            desiredPercent: 10,
          },
          mockPrisma as any,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects redemption when the locked reservation belongs to another client', async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue({
        id: 'res1',
        clientId: 'another-client',
        loyaltyPointsUsed: 0,
      });

      await expect(
        service.redeemForReservation(
          {
            clientId: 'u1',
            reservationId: 'res1',
            serviceId: 'svc1',
            desiredPercent: 10,
          },
          mockPrisma as any,
        ),
      ).rejects.toThrow(ConflictException);
      expect(mockPrisma.loyaltyAccount.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.loyaltyTransaction.findUnique).not.toHaveBeenCalled();
    });

    it('veže debit, ledger i reservation marker za isti transaction client', async () => {
      const values: Record<string, string | null> = {
        loyalty_enabled: 'true',
        loyalty_redeem_enabled: 'true',
        loyalty_tiers: null,
        loyalty_max_discount_percent: '100',
        loyalty_redeem_rate: '0.1',
        loyalty_min_points_to_redeem: '0',
      };
      mockSettings.getValue.mockImplementation((key: string) =>
        Promise.resolve(values[key] ?? null),
      );
      mockPrisma.reservation.findUnique.mockResolvedValue({
        id: 'res1',
        clientId: 'u1',
        loyaltyPointsUsed: 0,
      });
      const accountState = {
        id: 'acc1',
        userId: 'u1',
        points: 500,
        isActive: true,
        tier: null as string | null,
      };
      mockPrisma.loyaltyAccount.findUnique.mockImplementation(async () => ({
        ...accountState,
      }));
      mockPrisma.service.findMany.mockResolvedValue([
        {
          id: 'svc1',
          price: 50,
          loyaltyEnabled: true,
          loyaltyMaxDiscountPercent: 20,
        },
      ]);
      mockPrisma.loyaltyAccount.updateMany.mockImplementation(
        async ({ where, data }: any) => {
          if (where.id !== accountState.id) return { count: 0 };
          accountState.points = data.points.set;
          return { count: 1 };
        },
      );
      mockPrisma.loyaltyTransaction.create.mockResolvedValue({ id: 'txn1' });
      mockPrisma.loyaltyAccount.update.mockImplementation(
        async ({ data }: any) => {
          accountState.tier = data.tier;
          return { ...accountState };
        },
      );
      mockPrisma.reservation.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.redeemForReservation(
        {
          clientId: 'u1',
          reservationId: 'res1',
          serviceIds: ['svc1'],
          desiredPercent: 10,
        },
        mockPrisma as any,
      );

      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
      expect(mockPrisma.loyaltyAccount.updateMany).toHaveBeenCalledWith({
        where: { id: 'acc1', points: 500 },
        data: { points: { set: 450 } },
      });
      expect(mockPrisma.loyaltyTransaction.create).toHaveBeenCalledWith({
        data: {
          accountId: 'acc1',
          points: 50,
          type: 'REDEEM',
          source: 'Reservation res1 (10%)',
          idempotencyKey: 'loyalty.reservation.redeem:res1:v1',
        },
      });
      expect(mockPrisma.loyaltyAccount.update).toHaveBeenCalledWith({
        where: { id: 'acc1' },
        data: { tier: 'Silver' },
      });
      expect(mockPrisma.reservation.updateMany).toHaveBeenCalledWith({
        where: { id: 'res1', loyaltyPointsUsed: 0 },
        data: {
          loyaltyDiscountPercent: 10,
          loyaltyDiscountAmount: expect.anything(),
          loyaltyPointsUsed: 50,
        },
      });
      const markerUpdate = mockPrisma.reservation.updateMany.mock.calls[0]![0];
      expect(Number(markerUpdate.data.loyaltyDiscountAmount)).toBe(5);
      expect(result).toMatchObject({ id: 'acc1', points: 450 });
    });
  });

  describe('daily-log redemption', () => {
    it('uses decimal price math, caps the discount to redeemed points and records a replay-safe marker', async () => {
      const store = configureStatefulLoyaltyStore(100);
      const entryState = {
        id: 'log1',
        clientId: 'u1',
        status: 'PENDING',
        deletedAt: null,
        loyaltyDiscountPercent: 0,
        loyaltyDiscountAmount: 0,
        loyaltyPointsUsed: 0,
        items: [{ serviceId: 'svc1', unitPrice: '25.10' }],
      };
      mockPrisma.dailyLogEntry.findUnique.mockImplementation(async () => ({
        ...entryState,
      }));
      mockPrisma.dailyLogEntry.updateMany.mockImplementation(
        async ({ where, data }: any) => {
          if (
            where.id !== entryState.id ||
            entryState.loyaltyPointsUsed !== 0
          ) {
            return { count: 0 };
          }
          Object.assign(entryState, data);
          return { count: 1 };
        },
      );
      mockPrisma.service.findMany.mockResolvedValue([
        {
          id: 'svc1',
          price: '100.00',
          loyaltyEnabled: true,
          loyaltyMaxDiscountPercent: 20,
        },
      ]);
      mockSettings.getValue.mockImplementation(async (key: string) => {
        const values: Record<string, string | null> = {
          loyalty_enabled: 'true',
          loyalty_redeem_enabled: 'true',
          loyalty_tiers: null,
          loyalty_max_discount_percent: '100',
          loyalty_redeem_rate: '0.1',
          loyalty_min_points_to_redeem: '0',
        };
        return values[key] ?? null;
      });

      const args = {
        clientId: 'u1',
        dailyLogEntryId: 'log1',
        serviceId: 'svc1',
        desiredPercent: 10,
        actualPrice: 22.5,
      };
      await expect(service.redeemForDailyLog(args)).rejects.toThrow(
        BadRequestException,
      );
      expect(store.account.points).toBe(100);
      expect(store.transactions).toHaveLength(0);

      const first = await service.redeemForDailyLog({
        ...args,
        actualPrice: 22.6,
      });
      const replay = await service.redeemForDailyLog({
        ...args,
        actualPrice: 22.6,
      });

      expect(first.points).toBe(75);
      expect(replay.points).toBe(75);
      expect(entryState).toMatchObject({
        loyaltyDiscountPercent: 10,
        loyaltyPointsUsed: 25,
      });
      expect(Number(entryState.loyaltyDiscountAmount)).toBe(2.5);
      expect(store.transactions).toHaveLength(1);
      expect(store.transactions[0]).toMatchObject({
        points: 25,
        type: 'REDEEM',
        source: 'DailyLog log1 (10%)',
        idempotencyKey: 'loyalty.daily-log.redeem:log1:v1',
      });
    });
  });

  describe('transactional manual point mutations', () => {
    beforeEach(() => {
      mockSettings.getValue.mockImplementation(async (key: string) => {
        if (key === 'loyalty_redeem_enabled') return 'true';
        if (key === 'loyalty_min_points_to_redeem') return '0';
        if (key === 'loyalty_tiers') return null;
        return null;
      });
    });

    it('debits manual redemption once and conflicts if an idempotency key is reused with a different payload', async () => {
      const store = configureStatefulLoyaltyStore(100);
      const first = await service.redeemPoints(
        'acc1',
        40,
        'manual counter redemption',
        'manual-request-1',
      );
      const replay = await service.redeemPoints(
        'acc1',
        40,
        'manual counter redemption',
        'manual-request-1',
      );

      expect(first.points).toBe(60);
      expect(replay.points).toBe(60);
      expect(store.account.points).toBe(60);
      expect(store.transactions).toHaveLength(1);
      expect(store.transactions[0]).toMatchObject({
        points: 40,
        type: 'REDEEM',
        source: 'manual counter redemption',
        idempotencyKey: 'loyalty.manual.redeem:manual-request-1',
      });
      await expect(
        service.redeemPoints(
          'acc1',
          39,
          'manual counter redemption',
          'manual-request-1',
        ),
      ).rejects.toThrow(ConflictException);
      expect(store.account.points).toBe(60);
      expect(store.transactions).toHaveLength(1);
    });

    it('serializes competing redemptions and never lets the balance go negative', async () => {
      const store = configureStatefulLoyaltyStore(100);
      const results = await Promise.allSettled([
        service.redeemPoints('acc1', 60, 'parallel A', 'parallel-a'),
        service.redeemPoints('acc1', 60, 'parallel B', 'parallel-b'),
      ]);

      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        results.filter((result) => result.status === 'rejected'),
      ).toHaveLength(1);
      expect(store.account.points).toBe(40);
      expect(store.account.points).toBeGreaterThanOrEqual(0);
      expect(store.transactions).toHaveLength(1);
    });

    it('makes admin adjustments atomic, replay-safe, and prevents a negative result', async () => {
      const store = configureStatefulLoyaltyStore(100);
      const first = await service.adjustPoints(
        'acc1',
        15,
        'correction',
        'adjustment-request-1',
      );
      const replay = await service.adjustPoints(
        'acc1',
        15,
        'correction',
        'adjustment-request-1',
      );

      expect(first.points).toBe(115);
      expect(replay.points).toBe(115);
      expect(store.transactions).toHaveLength(1);
      expect(store.transactions[0]).toMatchObject({
        points: 15,
        type: 'ADJUST',
        source: 'correction',
        idempotencyKey: 'loyalty.manual.adjust:adjustment-request-1',
      });
      await expect(
        service.adjustPoints(
          'acc1',
          -200,
          'over-correction',
          'adjustment-request-2',
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.adjustPoints('acc1', 14, 'correction', 'adjustment-request-1'),
      ).rejects.toThrow(ConflictException);
      expect(store.account.points).toBe(115);
      expect(store.transactions).toHaveLength(1);
    });
  });

  describe('daily-log reversal', () => {
    it('clamps an earn reversal at zero and replays both earn/redeem reversals once', async () => {
      const store = configureStatefulLoyaltyStore(10);
      mockPrisma.loyaltyTransaction.findMany.mockResolvedValue([
        { id: 'earn-1', accountId: 'acc1', points: 20, type: 'EARN' },
        { id: 'redeem-1', accountId: 'acc1', points: 5, type: 'REDEEM' },
      ]);

      await service.reverseFromDailyLog('entry-1');
      await service.reverseFromDailyLog('entry-1');

      expect(store.account.points).toBe(5);
      expect(store.transactions).toHaveLength(2);
      expect(store.transactions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            points: -10,
            type: 'ADJUST',
            source: 'daily_log_reversal:entry-1',
            idempotencyKey: 'loyalty.daily-log.reversal:earn-1:v1',
          }),
          expect.objectContaining({
            points: 5,
            type: 'ADJUST',
            source: 'daily_log_reversal:entry-1',
            idempotencyKey: 'loyalty.daily-log.reversal:redeem-1:v1',
          }),
        ]),
      );
    });
  });

  it('returns loyalty reconciliation findings without writing balances or ledger rows', async () => {
    mockPrisma.loyaltyAccount.findMany.mockResolvedValue([
      { id: 'acc1', userId: 'u1', points: 5 },
      { id: 'acc-negative', userId: 'u-negative', points: -2 },
    ]);
    mockPrisma.loyaltyTransaction.groupBy.mockResolvedValue([
      { accountId: 'acc1', type: 'ADJUST', _sum: { points: 4 } },
      { accountId: 'acc-negative', type: 'ADJUST', _sum: { points: -2 } },
    ]);
    mockPrisma.reservation.findMany.mockResolvedValue([
      { id: 'res1', clientId: 'u1', loyaltyPointsUsed: 2 },
    ]);
    mockPrisma.dailyLogEntry.findMany.mockResolvedValue([]);
    mockPrisma.loyaltyTransaction.findMany.mockResolvedValue([]);

    const report = await service.getReconciliationReport();

    expect(report).toMatchObject({
      isReadOnly: true,
      summary: {
        accountsChecked: 2,
        negativeBalanceCount: 1,
        ledgerBalanceMismatchCount: 1,
        reservationMarkerIssueCount: 1,
      },
      negativeBalances: [{ accountId: 'acc-negative', points: -2 }],
      ledgerBalanceMismatches: [
        { accountId: 'acc1', points: 5, ledgerPoints: 4, difference: 1 },
      ],
      reservationMarkersWithoutTransaction: [
        expect.objectContaining({ resourceId: 'res1', markerPoints: 2 }),
      ],
    });
    expect(mockPrisma.loyaltyAccount.update).not.toHaveBeenCalled();
    expect(mockPrisma.loyaltyAccount.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.loyaltyTransaction.create).not.toHaveBeenCalled();
  });
});
