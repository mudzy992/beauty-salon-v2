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
      prisma.incomeBook.upsert.mockResolvedValue({
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
      prisma.incomeBook.upsert.mockResolvedValue({
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

    it('koristi proslijeđeni transaction client bez pokretanja root transakcije', async () => {
      prisma.dailyLogEntry.findUnique.mockResolvedValue(completedEntry);
      prisma.incomeBook.upsert.mockResolvedValue({
        id: 'b1',
        year: 2026,
        month: 3,
        closedAt: null,
      });
      prisma.incomeBookEntry.findUnique.mockResolvedValue(null);

      await service.addEntryFromDailyLog('dl1', prisma as any);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(prisma.incomeBookEntry.create).toHaveBeenCalled();
      expect(prisma.incomeBook.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'b1' } }),
      );
    });

    it('idempotentan je kada stavka već postoji', async () => {
      prisma.dailyLogEntry.findUnique.mockResolvedValue(completedEntry);
      prisma.incomeBook.upsert.mockResolvedValue({
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

  describe('checkCompletionIntegrity', () => {
    it('izvještava read-only o KIF, loyalty i reservation odstupanjima', async () => {
      const book = {
        id: 'b1',
        year: 2026,
        month: 3,
        closedAt: null,
      };
      prisma.incomeBook.findUnique.mockResolvedValue(book);
      prisma.dailyLogEntry.findMany
        .mockResolvedValueOnce([
          {
            id: 'dl-missing',
            date: new Date('2026-03-10'),
            completedAt: null,
            completionVersion: 1,
            clientId: 'client-1',
            actualPrice: dec(50),
            reservationId: 'r1',
            stylistProfileId: 'stylist-1',
            reservation: {
              id: 'r1',
              status: 'IN_PROGRESS',
              completedAt: null,
              confirmedStylistId: 'stylist-1',
            },
          },
          {
            id: 'dl-ok',
            date: new Date('2026-03-11'),
            completedAt: new Date('2026-03-11T12:00:00Z'),
            completionVersion: 1,
            clientId: 'client-2',
            actualPrice: dec(80),
            reservationId: null,
            stylistProfileId: 'stylist-2',
            reservation: null,
          },
        ])
        .mockResolvedValueOnce([]);
      prisma.loyaltyTransaction.findMany.mockResolvedValue([]);
      prisma.incomeBookEntry.findMany
        .mockResolvedValueOnce([
          {
            id: 'kif-1',
            dailyLogEntryId: 'dl-ok',
            bookId: 'b1',
            book: { year: 2026, month: 3 },
          },
        ])
        .mockResolvedValueOnce([]);

      const actual = await service.checkCompletionIntegrity('b1');

      expect(actual.isReadOnly).toBe(true);
      expect(actual.isHealthy).toBe(false);
      expect(actual.counts).toMatchObject({
        scanned: 2,
        missingKif: 1,
        missingCompletionTimestamp: 1,
        reservationMismatch: 1,
        loyaltyNoEarnFound: 2,
      });
      expect(actual.caveats[0]).toContain('ne dokaz');
      expect(prisma.incomeBookEntry.create).not.toHaveBeenCalled();
      expect(prisma.incomeBook.upsert).not.toHaveBeenCalled();
      expect(prisma.loyaltyTransaction.create).not.toHaveBeenCalled();
    });

    it('marks uncertain historical loyalty absence for review, not as a confirmed unhealthy state', async () => {
      prisma.incomeBook.findUnique.mockResolvedValue({
        id: 'b1',
        year: 2026,
        month: 3,
        closedAt: null,
      });
      prisma.dailyLogEntry.findMany
        .mockResolvedValueOnce([
          {
            id: 'dl-candidate',
            date: new Date('2026-03-12'),
            completedAt: new Date('2026-03-12T12:00:00Z'),
            completionVersion: 1,
            clientId: 'client-3',
            actualPrice: dec(60),
            reservationId: null,
            stylistProfileId: 'stylist-3',
            reservation: null,
          },
        ])
        .mockResolvedValueOnce([]);
      prisma.incomeBookEntry.findMany
        .mockResolvedValueOnce([
          {
            id: 'kif-candidate',
            dailyLogEntryId: 'dl-candidate',
            bookId: 'b1',
            book: { year: 2026, month: 3 },
          },
        ])
        .mockResolvedValueOnce([]);
      prisma.loyaltyTransaction.findMany.mockResolvedValue([]);

      const actual = await service.checkCompletionIntegrity('b1');

      expect(actual.isHealthy).toBe(true);
      expect(actual.needsReview).toBe(true);
      expect(actual.counts.loyaltyNoEarnFound).toBe(1);
      expect(actual.counts.missingKif).toBe(0);
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

    it('ne prijavljuje uspješan resync kad KIF red već postoji u drugoj knjizi', async () => {
      prisma.incomeBook.findUnique.mockResolvedValue({
        id: 'b1',
        year: 2026,
        month: 3,
        closedAt: null,
      });
      prisma.dailyLogEntry.findMany.mockResolvedValue([{ id: 'dl1' }]);
      prisma.incomeBookEntry.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { dailyLogEntryId: 'dl1', bookId: 'b0' },
        ]);

      await expect(service.resyncBook('b1')).rejects.toThrow(
        'već imaju KIF stavku u drugoj knjizi',
      );
      expect(prisma.incomeBookEntry.create).not.toHaveBeenCalled();
    });
  });
});
