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
import { DailyLogCompletionOutboxService } from './daily-log-completion-outbox.service';

const mockPrisma = {
  $transaction: jest.fn(),
  $queryRaw: jest.fn().mockResolvedValue([]),
  outboxEvent: { upsert: jest.fn() },
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
  reservation: { findUnique: jest.fn(), update: jest.fn() },
};

const mockIncomeSync = {
  addEntryFromDailyLog: jest.fn(),
  assertBookOpenForDate: jest.fn(),
  recalculateTotals: jest.fn(),
};

const mockLoyalty = {
  earnFromDailyLog: jest.fn(),
};

const mockCompletionOutbox = {
  dispatchAfterCommit: jest.fn(),
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
    mockPrisma.outboxEvent.upsert.mockResolvedValue({ id: 'outbox-1' });
    mockCompletionOutbox.dispatchAfterCommit.mockResolvedValue(undefined);
    mockLoyalty.earnFromDailyLog.mockResolvedValue(null);
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
        { provide: LoyaltyService, useValue: mockLoyalty },
        { provide: NotificationsService, useValue: { send: jest.fn() } },
        {
          provide: DailyLogCompletionOutboxService,
          useValue: mockCompletionOutbox,
        },
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

  it('completes state, KIF, loyalty and outbox work on one transaction client', async () => {
    const entry = {
      id: 'e1',
      stylistProfileId: 'sp-1',
      status: 'PENDING',
      kind: 'SERVICE',
      clientId: 'client-1',
      serviceId: 'service-1',
      actualPrice: 100,
      tipAmount: 10,
      completionVersion: 0,
      completedAt: null,
      deletedAt: null,
      reservationId: null,
      stylistProfile: { userId: 'user-1', user: { id: 'user-1' } },
      service: {},
      client: null,
      reservation: null,
      images: [],
    };
    const completed = {
      ...entry,
      status: 'COMPLETED',
      completionVersion: 1,
      completedAt: new Date('2026-10-24T10:00:00.000Z'),
    };
    mockPrisma.dailyLogEntry.findUnique
      .mockResolvedValueOnce(entry)
      .mockResolvedValueOnce(entry)
      .mockResolvedValueOnce(completed);
    mockPrisma.stylistProfile.findUnique.mockResolvedValue({
      userId: 'user-1',
    });

    const result = await service.complete('e1', user as any);

    expect(result.status).toBe('COMPLETED');
    expect(mockIncomeSync.addEntryFromDailyLog).toHaveBeenCalledWith(
      'e1',
      mockPrisma,
    );
    expect(mockLoyalty.earnFromDailyLog).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'e1',
        idempotencyKey: 'daily-log.earn:e1:v1',
      }),
      mockPrisma,
    );
    expect(mockPrisma.outboxEvent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { dedupeKey: 'daily-log.completed:e1:v1' },
        create: expect.objectContaining({
          eventType: 'daily_log.completed',
          aggregateId: 'e1',
          payload: { dailyLogEntryId: 'e1', completionVersion: 1 },
        }),
      }),
    );
    expect(mockCompletionOutbox.dispatchAfterCommit).toHaveBeenCalledWith(
      'outbox-1',
    );
  });

  it('retry na već završenom zapisu vraća stanje i ne pravi novu generaciju', async () => {
    const completed = {
      id: 'e1',
      stylistProfileId: 'sp-1',
      status: 'COMPLETED',
      kind: 'SERVICE',
      clientId: 'client-1',
      serviceId: 'service-1',
      actualPrice: 100,
      tipAmount: 10,
      completionVersion: 3,
      completedAt: new Date('2026-10-24T10:00:00.000Z'),
      deletedAt: null,
      reservationId: null,
      stylistProfile: { userId: 'user-1', user: { id: 'user-1' } },
      service: {},
      client: null,
      reservation: null,
      images: [],
    };
    mockPrisma.dailyLogEntry.findUnique.mockResolvedValue(completed);
    mockPrisma.stylistProfile.findUnique.mockResolvedValue({
      userId: 'user-1',
    });

    const result = await service.complete('e1', user as any);

    expect(result).toMatchObject({ status: 'COMPLETED', completionVersion: 3 });
    expect(mockPrisma.dailyLogEntry.update).not.toHaveBeenCalled();
    expect(mockLoyalty.earnFromDailyLog).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: 'daily-log.earn:e1:v3' }),
      mockPrisma,
    );
    expect(mockPrisma.outboxEvent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { dedupeKey: 'daily-log.completed:e1:v3' },
      }),
    );
  });

  it('completed retry reconciles KIF/loyalty/outbox despite a terminal reservation mismatch', async () => {
    const completed = {
      id: 'e1',
      stylistProfileId: 'sp-1',
      status: 'COMPLETED',
      kind: 'SERVICE',
      clientId: 'client-1',
      serviceId: 'service-1',
      actualPrice: 100,
      tipAmount: 10,
      completionVersion: 1,
      completedAt: new Date('2026-10-24T10:00:00.000Z'),
      deletedAt: null,
      reservationId: 'r1',
      stylistProfile: { userId: 'user-1', user: { id: 'user-1' } },
      service: {},
      client: null,
      reservation: null,
      images: [],
    };
    mockPrisma.dailyLogEntry.findUnique.mockResolvedValue(completed);
    mockPrisma.stylistProfile.findUnique.mockResolvedValue({
      userId: 'user-1',
    });
    mockPrisma.reservation.findUnique.mockResolvedValue({
      id: 'r1',
      clientId: 'client-1',
      confirmedStylistId: 'other-stylist',
      status: 'CANCELLED_BY_CLIENT',
      completedAt: null,
    });

    const result = await service.complete('e1', user as any);

    expect(result).toMatchObject({ status: 'COMPLETED', completionVersion: 1 });
    expect(mockPrisma.reservation.update).not.toHaveBeenCalled();
    expect(mockIncomeSync.addEntryFromDailyLog).toHaveBeenCalledWith(
      'e1',
      mockPrisma,
    );
    expect(mockLoyalty.earnFromDailyLog).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: 'daily-log.earn:e1:v1' }),
      mockPrisma,
    );
    expect(mockPrisma.outboxEvent.upsert).toHaveBeenCalled();
  });

  it('ne dispatchuje receipt/outbox ako KIF write unutar transakcije zakaže', async () => {
    const pending = {
      id: 'e1',
      stylistProfileId: 'sp-1',
      status: 'PENDING',
      kind: 'SERVICE',
      clientId: 'client-1',
      serviceId: 'service-1',
      actualPrice: 100,
      tipAmount: 10,
      completionVersion: 0,
      completedAt: null,
      deletedAt: null,
      reservationId: null,
      stylistProfile: { userId: 'user-1', user: { id: 'user-1' } },
      service: {},
      client: null,
      reservation: null,
      images: [],
    };
    mockPrisma.dailyLogEntry.findUnique
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce(pending);
    mockPrisma.stylistProfile.findUnique.mockResolvedValue({
      userId: 'user-1',
    });
    mockIncomeSync.addEntryFromDailyLog.mockRejectedValueOnce(
      new Error('KIF write failed'),
    );

    await expect(service.complete('e1', user as any)).rejects.toThrow(
      'KIF write failed',
    );

    expect(mockPrisma.outboxEvent.upsert).not.toHaveBeenCalled();
    expect(mockCompletionOutbox.dispatchAfterCommit).not.toHaveBeenCalled();
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
