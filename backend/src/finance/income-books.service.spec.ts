import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IncomeBooksService } from './income-books.service';
import { IncomeBookRepository } from './repositories/income-book.repository';
import { PrismaService } from '../prisma/prisma.service';
import {
  createFinancePrismaMock,
  type FinancePrismaMock,
} from './testing/prisma-mock';

const pastPeriod = () => {
  const now = new Date();
  return now.getMonth() === 0
    ? { year: now.getFullYear() - 1, month: 12 }
    : { year: now.getFullYear(), month: now.getMonth() };
};

const currentPeriod = () => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
};

describe('IncomeBooksService', () => {
  let service: IncomeBooksService;
  let prisma: FinancePrismaMock;

  beforeEach(async () => {
    prisma = createFinancePrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncomeBooksService,
        IncomeBookRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(IncomeBooksService);
    prisma.incomeBook.updateMany.mockResolvedValue({ count: 1 });
    prisma.incomeBookLockEvent.create.mockResolvedValue({ id: 'lock-event-1' });
  });

  describe('getOrCreateForMonth', () => {
    it('atomically vrati ili kreira knjigu na proslijeđenom clientu', async () => {
      const { year, month } = currentPeriod();
      prisma.incomeBook.upsert.mockResolvedValue({ id: 'b1', year, month });
      prisma.incomeBook.findUnique.mockResolvedValue({ id: 'b1', year, month });
      const tx = prisma as any;

      const actual = await service.getOrCreateForMonth(year, month, tx);

      expect(prisma.incomeBook.upsert).toHaveBeenCalledWith({
        where: { year_month: { year, month } },
        create: { year, month },
        update: {},
        include: { entries: true },
      });
      expect(actual.id).toBe('b1');
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('odbija budući mjesec', async () => {
      const next = new Date();
      next.setMonth(next.getMonth() + 2);
      await expect(
        service.getOrCreateForMonth(next.getFullYear(), next.getMonth() + 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('odbija nevalidan mjesec', async () => {
      await expect(service.getOrCreateForMonth(2026, 13)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('lockBook', () => {
    it('uslovno zaključava otvorenu knjigu i bilježi jedan LOCK događaj', async () => {
      prisma.incomeBook.findUnique.mockResolvedValue({
        id: 'b1',
        closedAt: new Date(),
      });

      await service.lockBook('b1', 'u1');

      expect(prisma.incomeBook.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'b1', closedAt: null },
          data: { closedAt: expect.any(Date) },
        }),
      );
      expect(prisma.incomeBookLockEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bookId: 'b1',
          action: 'LOCK',
          createdById: 'u1',
        }),
      });
    });

    it('odbija već zaključanu knjigu bez dodatnog LOCK događaja', async () => {
      prisma.incomeBook.updateMany.mockResolvedValue({ count: 0 });
      prisma.incomeBook.findUnique.mockResolvedValue({
        id: 'b1',
        closedAt: new Date(),
      });
      await expect(service.lockBook('b1', 'u1')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.incomeBookLockEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('unlockBook', () => {
    it('zahtijeva razlog', async () => {
      await expect(service.unlockBook('b1', '   ', 'u1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('odbija otključavanje tekućeg mjeseca', async () => {
      const { year, month } = currentPeriod();
      prisma.incomeBook.findUnique.mockResolvedValue({
        id: 'b1',
        year,
        month,
        closedAt: new Date(),
      });
      await expect(service.unlockBook('b1', 'ispravka', 'u1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('otključava prošli mjesec i bilježi UNLOCK sa razlogom', async () => {
      const { year, month } = pastPeriod();
      prisma.incomeBook.findUnique
        .mockResolvedValueOnce({
          id: 'b1',
          year,
          month,
          closedAt: new Date(),
        })
        .mockResolvedValueOnce({ id: 'b1', closedAt: null });

      await service.unlockBook('b1', 'ispravka iznosa', 'u1');

      expect(prisma.incomeBook.updateMany).toHaveBeenCalledWith({
        where: { id: 'b1', closedAt: { not: null } },
        data: { closedAt: null },
      });
      expect(prisma.incomeBookLockEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bookId: 'b1',
          action: 'UNLOCK',
          reason: 'ispravka iznosa',
          createdById: 'u1',
        }),
      });
    });
  });

  describe('getEditableBookOrThrow', () => {
    it('odbija zaključanu knjigu', async () => {
      prisma.incomeBook.findUnique.mockResolvedValue({
        id: 'b1',
        year: 2026,
        month: 1,
        closedAt: new Date(),
      });
      await expect(
        service.getEditableBookOrThrow('b1', 'izmjena'),
      ).rejects.toThrow(BadRequestException);
    });

    it('baca kada knjiga ne postoji', async () => {
      prisma.incomeBook.findUnique.mockResolvedValue(null);
      await expect(
        service.getEditableBookOrThrow('nope', 'izmjena'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('openNewMonthAndClosePrevious', () => {
    it('zatvara prethodnu knjigu uz automatski LOCK zapis i otvara tekuću', async () => {
      prisma.incomeBook.findUnique
        .mockResolvedValueOnce({ id: 'prev', closedAt: null })
        .mockResolvedValueOnce({ id: 'prev', closedAt: new Date() })
        .mockResolvedValueOnce(null);
      prisma.incomeBook.create.mockResolvedValue({ id: 'curr' });

      const actual = await service.openNewMonthAndClosePrevious();

      expect(actual).toEqual({ opened: 'curr', closed: 'prev' });
      expect(prisma.incomeBook.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'prev', closedAt: null } }),
      );
      expect(prisma.incomeBookLockEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bookId: 'prev',
          action: 'LOCK',
          reason: 'Automatsko zaključavanje na kraju mjeseca.',
          createdById: undefined,
        }),
      });
    });

    it('idempotentan je kada je prethodna već zatvorena i tekuća postoji', async () => {
      prisma.incomeBook.findUnique
        .mockResolvedValueOnce({ id: 'prev', closedAt: new Date() })
        .mockResolvedValueOnce({ id: 'curr' });

      const actual = await service.openNewMonthAndClosePrevious();

      expect(prisma.incomeBook.update).not.toHaveBeenCalled();
      expect(prisma.incomeBook.create).not.toHaveBeenCalled();
      expect(actual).toEqual({ opened: 'curr', closed: 'prev' });
    });
  });
});
