import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IncomeManualEntriesService } from './income-manual-entries.service';
import { IncomeBooksService } from './income-books.service';
import { IncomeBookRepository } from './repositories/income-book.repository';
import { PrismaService } from '../prisma/prisma.service';
import {
  createFinancePrismaMock,
  type FinancePrismaMock,
} from './testing/prisma-mock';

const dec = (value: number) => new Prisma.Decimal(value);

const openBook = { id: 'b1', year: 2026, month: 3, closedAt: null };
const bookDate = '2026-03-10';

const makeEntry = (overrides: Record<string, unknown> = {}) => ({
  id: 'e1',
  bookId: 'b1',
  date: new Date('2026-03-10'),
  serviceId: 's1',
  stylistProfileId: 'st1',
  clientId: 'c1',
  amount: dec(60),
  tipAmount: dec(0),
  notes: null,
  ...overrides,
});

describe('IncomeManualEntriesService', () => {
  let service: IncomeManualEntriesService;
  let prisma: FinancePrismaMock;

  beforeEach(async () => {
    prisma = createFinancePrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncomeManualEntriesService,
        IncomeBooksService,
        IncomeBookRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(IncomeManualEntriesService);

    prisma.incomeBook.findUnique.mockResolvedValue(openBook);
    prisma.service.findUnique.mockResolvedValue({ price: dec(100) });
    prisma.incomeBookEntry.aggregate.mockResolvedValue({ _sum: {} });
    prisma.incomeBookManualEntry.aggregate.mockResolvedValue({ _sum: {} });
    prisma.incomeBookManualEntry.create.mockResolvedValue(makeEntry());
    prisma.incomeBookManualEntry.update.mockResolvedValue(makeEntry());
    prisma.clientDebt.findFirst.mockResolvedValue(null);
  });

  const baseDto = {
    date: bookDate,
    serviceId: 's1',
    stylistProfileId: 'st1',
    clientId: 'c1',
  };

  describe('create', () => {
    it('dijeli naplatu na osnovicu i napojnicu', async () => {
      await service.create('b1', { ...baseDto, paidAmount: 130 }, 'u1');

      const data = prisma.incomeBookManualEntry.create.mock.calls[0][0].data;
      expect(prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        prisma.incomeBookManualEntry.create.mock.invocationCallOrder[0],
      );
      expect(data.amount).toBe(100);
      expect(data.tipAmount).toBe(30);
    });

    it('kreira dug za nenaplaćeni dio kada je traženo', async () => {
      await service.create(
        'b1',
        { ...baseDto, paidAmount: 60, debtHandling: 'CREATE_DEBT' },
        'u1',
      );

      expect(prisma.clientDebt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ amount: 40, manualEntryId: 'e1' }),
        }),
      );
    });

    it('ne kreira dug kada je IGNORE_DEBT', async () => {
      await service.create(
        'b1',
        { ...baseDto, paidAmount: 60, debtHandling: 'IGNORE_DEBT' },
        'u1',
      );
      expect(prisma.clientDebt.create).not.toHaveBeenCalled();
    });

    it('traži klijenta za dug', async () => {
      await expect(
        service.create(
          'b1',
          { ...baseDto, clientId: undefined, paidAmount: 60, debtHandling: 'CREATE_DEBT' },
          'u1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('odbija datum izvan mjeseca knjige', async () => {
      await expect(
        service.create('b1', { ...baseDto, date: '2026-04-01', paidAmount: 100 }, 'u1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('odbija zaključanu knjigu', async () => {
      prisma.incomeBook.findUnique.mockResolvedValue({
        ...openBook,
        closedAt: new Date(),
      });
      await expect(
        service.create('b1', { ...baseDto, paidAmount: 100 }, 'u1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('osvježava totale unutar iste transakcije', async () => {
      await service.create('b1', { ...baseDto, paidAmount: 100 }, 'u1');
      expect(prisma.incomeBook.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'b1' } }),
      );
    });
  });

  describe('update', () => {
    beforeEach(() => {
      prisma.incomeBookManualEntry.findUnique.mockResolvedValue(makeEntry());
    });

    it('ažurira postojeći dug umjesto da kreira novi', async () => {
      prisma.clientDebt.findFirst
        .mockResolvedValueOnce(null) // assertNoSettledDebt
        .mockResolvedValueOnce({ id: 'd1' }); // postojeći OPEN dug

      await service.update(
        'b1',
        'e1',
        { paidAmount: 70, debtHandling: 'CREATE_DEBT' },
        'u1',
      );

      expect(prisma.clientDebt.create).not.toHaveBeenCalled();
      expect(prisma.clientDebt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'd1' },
          data: expect.objectContaining({ amount: 30 }),
        }),
      );
    });

    it('briše dug kada naplata pokrije punu cijenu', async () => {
      prisma.clientDebt.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'd1' });

      await service.update(
        'b1',
        'e1',
        { paidAmount: 100, debtHandling: 'CREATE_DEBT' },
        'u1',
      );

      expect(prisma.clientDebt.delete).toHaveBeenCalledWith({
        where: { id: 'd1' },
      });
      expect(prisma.clientDebt.create).not.toHaveBeenCalled();
    });

    it('briše dug kada se pređe na IGNORE_DEBT', async () => {
      prisma.clientDebt.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'd1' });

      await service.update(
        'b1',
        'e1',
        { paidAmount: 60, debtHandling: 'IGNORE_DEBT' },
        'u1',
      );

      expect(prisma.clientDebt.delete).toHaveBeenCalledWith({
        where: { id: 'd1' },
      });
    });

    it('blokira izmjenu kada je vezani dug već naplaćen', async () => {
      prisma.clientDebt.findFirst.mockResolvedValueOnce({ id: 'd1' });

      await expect(
        service.update('b1', 'e1', { paidAmount: 90 }, 'u1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('piše audit sa prethodnim i novim stanjem', async () => {
      await service.update('b1', 'e1', { paidAmount: 90 }, 'u1');

      const audit =
        prisma.incomeBookManualEntryAudit.create.mock.calls[0][0].data;
      expect(audit.action).toBe('UPDATE');
      expect(audit.beforeJson).toBeDefined();
      expect(audit.afterJson).toBeDefined();
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      prisma.incomeBookManualEntry.findUnique.mockResolvedValue(makeEntry());
    });

    it('briše vezani otvoreni dug zajedno sa stavkom', async () => {
      prisma.clientDebt.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'd1' });

      await service.remove('b1', 'e1', 'u1');

      expect(prisma.clientDebt.delete).toHaveBeenCalledWith({
        where: { id: 'd1' },
      });
      expect(prisma.incomeBookManualEntry.delete).toHaveBeenCalledWith({
        where: { id: 'e1' },
      });
    });

    it('blokira brisanje kada je dug već naplaćen', async () => {
      prisma.clientDebt.findFirst.mockResolvedValueOnce({ id: 'd1' });

      await expect(service.remove('b1', 'e1', 'u1')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.incomeBookManualEntry.delete).not.toHaveBeenCalled();
    });

    it('osvježava totale nakon brisanja', async () => {
      await service.remove('b1', 'e1', 'u1');
      expect(prisma.incomeBook.update).toHaveBeenCalled();
    });
  });
});
