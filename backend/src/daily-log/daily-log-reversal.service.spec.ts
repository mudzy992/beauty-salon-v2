import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { IncomeSyncService } from '../finance/income-sync.service';
import { IncomeBookRepository } from '../finance/repositories/income-book.repository';
import { createFinancePrismaMock } from '../finance/testing/prisma-mock';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { DailyLogReversalService } from './daily-log-reversal.service';

describe('DailyLogReversalService', () => {
  let service: DailyLogReversalService;
  const prisma = createFinancePrismaMock();
  const incomeSync = {
    assertBookOpenById: jest.fn(),
    assertBookOpenForDate: jest.fn(),
    assertBooksOpenForDateAndIds: jest.fn(),
    assertBooksOpenForDatesAndIds: jest.fn(),
    addEntryFromDailyLog: jest.fn(),
  };
  const incomeBookRepository = { recalculateTotals: jest.fn() };
  const loyalty = {};

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyLogReversalService,
        { provide: PrismaService, useValue: prisma },
        { provide: IncomeSyncService, useValue: incomeSync },
        { provide: IncomeBookRepository, useValue: incomeBookRepository },
        { provide: LoyaltyService, useValue: loyalty },
      ],
    }).compile();
    service = module.get(DailyLogReversalService);
    prisma.dailyLogEntry.findMany.mockResolvedValue([
      { id: 'payment-1', debtId: 'debt-1' },
      { id: 'payment-2', debtId: 'debt-2' },
    ]);
    prisma.incomeBookManualEntry.findMany.mockResolvedValue([
      { bookId: 'book-b' },
      { bookId: 'book-a' },
      { bookId: 'book-a' },
    ]);
    prisma.incomeBookManualEntry.deleteMany.mockResolvedValue({ count: 3 });
  });

  it('locks every affected income book before removing linked debt-payment entries', async () => {
    await service.reverseLinkedDebtPayments(prisma as never, 'source-1');

    expect(incomeSync.assertBookOpenById.mock.calls).toEqual([
      ['book-a', prisma],
      ['book-b', prisma],
    ]);
    expect(
      Math.max(...incomeSync.assertBookOpenById.mock.invocationCallOrder),
    ).toBeLessThan(
      prisma.incomeBookManualEntry.deleteMany.mock.invocationCallOrder[0],
    );
    expect(prisma.incomeBookManualEntry.findMany).toHaveBeenCalledWith({
      where: { dailyLogEntryId: { in: ['payment-1', 'payment-2'] } },
      select: { bookId: true },
    });
    expect(prisma.incomeBookManualEntry.deleteMany).toHaveBeenCalledWith({
      where: { dailyLogEntryId: { in: ['payment-1', 'payment-2'] } },
    });
    expect(incomeBookRepository.recalculateTotals.mock.calls).toEqual([
      ['book-a', prisma],
      ['book-b', prisma],
    ]);
    expect(prisma.clientDebt.update).toHaveBeenCalledTimes(2);
    expect(prisma.dailyLogEntry.update).toHaveBeenCalledTimes(2);
  });

  it('checks linked daily-log periods and every affected income book together', async () => {
    const sourceDate = new Date('2026-10-01T00:00:00.000Z');
    const paymentDates = [
      new Date('2026-09-15T00:00:00.000Z'),
      new Date('2026-08-15T00:00:00.000Z'),
    ];
    prisma.dailyLogEntry.findMany.mockResolvedValue([
      { id: 'payment-1', date: paymentDates[0] },
      { id: 'payment-2', date: paymentDates[1] },
    ]);
    prisma.incomeBookEntry.findMany.mockResolvedValue([
      { bookId: 'book-c' },
    ]);
    prisma.incomeBookManualEntry.findMany.mockResolvedValue([
      { bookId: 'book-a' },
      { bookId: 'book-c' },
    ]);

    await service.assertOpenBooksForEntry(
      { id: 'source-1', date: sourceDate },
      prisma as never,
    );

    expect(incomeSync.assertBooksOpenForDatesAndIds).toHaveBeenCalledWith(
      [sourceDate, ...paymentDates],
      ['book-a', 'book-c'],
      prisma,
    );
  });

  it('locks and rereads the daily-log row before synchronizing its income entry', async () => {
    const entry = {
      id: 'entry-1',
      date: new Date('2026-10-01T00:00:00.000Z'),
      actualPrice: 100,
      tipAmount: 10,
      status: 'COMPLETED',
      kind: 'SERVICE',
      deletedAt: null,
    };
    prisma.dailyLogEntry.findUnique.mockResolvedValue(entry);
    prisma.incomeBookEntry.findFirst.mockResolvedValue(null);

    await service.syncIncomeBookEntry(entry);

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.dailyLogEntry.findUnique).toHaveBeenCalledWith({
      where: { id: entry.id },
    });
    expect(incomeSync.addEntryFromDailyLog).toHaveBeenCalledWith(
      entry.id,
      prisma,
    );
    expect(prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      incomeSync.addEntryFromDailyLog.mock.invocationCallOrder[0],
    );
  });

  it('locks both source and target books in one sorted transaction when income changes month', async () => {
    const entry = {
      id: 'entry-2',
      date: new Date('2026-10-01T00:00:00.000Z'),
      actualPrice: 100,
      tipAmount: 10,
      status: 'COMPLETED',
      kind: 'SERVICE',
      deletedAt: null,
    };
    prisma.dailyLogEntry.findUnique.mockResolvedValue(entry);
    prisma.incomeBookEntry.findFirst.mockResolvedValue({
      id: 'income-entry-1',
      bookId: 'book-a',
    });
    incomeSync.assertBooksOpenForDateAndIds.mockResolvedValue({
      id: 'book-b',
    });

    await service.syncIncomeBookEntry(entry);

    expect(incomeSync.assertBooksOpenForDateAndIds).toHaveBeenCalledWith(
      entry.date,
      ['book-a'],
      prisma,
    );
    expect(prisma.incomeBookEntry.delete).toHaveBeenCalledWith({
      where: { id: 'income-entry-1' },
    });
    expect(prisma.incomeBookEntry.create).toHaveBeenCalledWith({
      data: {
        bookId: 'book-b',
        dailyLogEntryId: entry.id,
        amount: 90,
        tipAmount: 10,
        date: entry.date,
      },
    });
    expect(prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      incomeSync.assertBooksOpenForDateAndIds.mock.invocationCallOrder[0],
    );
  });
});
