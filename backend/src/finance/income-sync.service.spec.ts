import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IncomeSyncService } from './income-sync.service';
import { IncomeBooksService } from './income-books.service';
import { IncomeBookRepository } from './repositories/income-book.repository';
import { PrismaService } from '../prisma/prisma.service';
import {
  createFinancePrismaMock,
  type FinancePrismaMock,
} from './testing/prisma-mock';

const dec = (value: number) => new Prisma.Decimal(value);

const completedEntry = {
  id: 'dl1',
  status: 'COMPLETED',
  kind: 'SERVICE',
  deletedAt: null,
  date: new Date('2026-03-10'),
  actualPrice: dec(130),
  tipAmount: dec(30),
};

describe('IncomeSyncService', () => {
  let service: IncomeSyncService;
  let prisma: FinancePrismaMock;

  beforeEach(async () => {
    prisma = createFinancePrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncomeSyncService,
        IncomeBooksService,
        IncomeBookRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(IncomeSyncService);

    prisma.incomeBookEntry.aggregate.mockResolvedValue({ _sum: {} });
    prisma.incomeBookManualEntry.aggregate.mockResolvedValue({ _sum: {} });
    prisma.incomeBookEntry.create.mockResolvedValue({ id: 'ie1' });
  });

  describe('addEntryFromDailyLog', () => {
    it('baca kada zapis dnevnika ne postoji', async () => {
      prisma.dailyLogEntry.findUnique.mockResolvedValue(null);
      await expect(service.addEntryFromDailyLog('nope')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('odbija zapis koji nije završen', async () => {
      prisma.dailyLogEntry.findUnique.mockResolvedValue({
        ...completedEntry,
        status: 'PENDING',
      });
      await expect(service.addEntryFromDailyLog('dl1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('odbija obrisani zapis', async () => {
      prisma.dailyLogEntry.findUnique.mockResolvedValue({
        ...completedEntry,
        deletedAt: new Date(),
      });
      await expect(service.addEntryFromDailyLog('dl1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('preskače naplatu duga jer se knjiži kao ručna stavka', async () => {
      prisma.dailyLogEntry.findUnique.mockResolvedValue({
        ...completedEntry,
        kind: 'DEBT_PAYMENT',
      });
      await expect(service.addEntryFromDailyLog('dl1')).resolves.toBeNull();
    });

    it('odbija knjiženje u zaključanu knjigu', async () => {
      prisma.dailyLogEntry.findUnique.mockResolvedValue(completedEntry);
      prisma.incomeBook.findUnique.mockResolvedValue({
        id: 'b1',
        year: 2026,
        month: 3,
        closedAt: new Date(),
      });

      await expect(service.addEntryFromDailyLog('dl1')).rejects.toThrow(
        'Mjesec je zaključan u KIF-u.',
      );
      expect(prisma.incomeBookEntry.create).not.toHaveBeenCalled();
    });

    it('knjiži iznos bez napojnice', async () => {
      prisma.dailyLogEntry.findUnique.mockResolvedValue(completedEntry);
      prisma.incomeBook.findUnique.mockResolvedValue({
        id: 'b1',
        year: 2026,
        month: 3,
        closedAt: null,
      });
      prisma.incomeBookEntry.findUnique.mockResolvedValue(null);

      await service.addEntryFromDailyLog('dl1');

      const data = prisma.incomeBookEntry.create.mock.calls[0][0].data;
      expect(Number(data.amount)).toBe(100);
      expect(Number(data.tipAmount)).toBe(30);
    });

    it('idempotentan je kada stavka već postoji', async () => {
      prisma.dailyLogEntry.findUnique.mockResolvedValue(completedEntry);
      prisma.incomeBook.findUnique.mockResolvedValue({
        id: 'b1',
        year: 2026,
        month: 3,
        closedAt: null,
      });
      prisma.incomeBookEntry.findUnique.mockResolvedValue({ id: 'existing' });

      const actual = await service.addEntryFromDailyLog('dl1');

      expect(actual).toEqual({ id: 'existing' });
      expect(prisma.incomeBookEntry.create).not.toHaveBeenCalled();
    });
  });

  describe('recalculateTotals', () => {
    it('sabira automatske i ručne stavke', async () => {
      prisma.incomeBookEntry.aggregate.mockResolvedValue({
        _sum: { amount: dec(100), tipAmount: dec(10) },
      });
      prisma.incomeBookManualEntry.aggregate.mockResolvedValue({
        _sum: { amount: dec(50), tipAmount: dec(5) },
      });

      await service.recalculateTotals('b1');

      expect(prisma.incomeBook.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { totalRevenue: 150, totalTips: 15 },
      });
    });
  });

  describe('checkIntegrity', () => {
    it('prijavljuje zapise dnevnika bez KIF stavke', async () => {
      prisma.incomeBook.findUnique.mockResolvedValue({
        id: 'b1',
        year: 2026,
        month: 3,
        closedAt: null,
      });
      prisma.dailyLogEntry.findMany.mockResolvedValue([{ id: 'dl1' }]);
      prisma.incomeBookEntry.findMany.mockResolvedValue([]);

      const actual = await service.checkIntegrity('b1');

      expect(actual.missingCount).toBe(1);
      expect(actual.isHealthy).toBe(false);
    });

    it('vraća zdravo stanje kada nema odstupanja', async () => {
      prisma.incomeBook.findUnique.mockResolvedValue({
        id: 'b1',
        year: 2026,
        month: 3,
        closedAt: null,
      });
      prisma.dailyLogEntry.findMany.mockResolvedValue([]);
      prisma.incomeBookEntry.findMany.mockResolvedValue([]);

      const actual = await service.checkIntegrity('b1');

      expect(actual.isHealthy).toBe(true);
    });
  });

  describe('resyncBook', () => {
    it('odbija sinhronizaciju zaključane knjige', async () => {
      prisma.incomeBook.findUnique.mockResolvedValue({
        id: 'b1',
        year: 2026,
        month: 3,
        closedAt: new Date(),
      });
      prisma.dailyLogEntry.findMany.mockResolvedValue([]);
      prisma.incomeBookEntry.findMany.mockResolvedValue([]);

      await expect(service.resyncBook('b1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
