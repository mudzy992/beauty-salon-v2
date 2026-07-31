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
  });

  describe('getOrCreateForMonth', () => {
    it('kreira knjigu kada ne postoji', async () => {
      const { year, month } = currentPeriod();
      prisma.incomeBook.findUnique.mockResolvedValue(null);
      prisma.incomeBook.create.mockResolvedValue({ id: 'b1', year, month });

      const actual = await service.getOrCreateForMonth(year, month);

      expect(prisma.incomeBook.create).toHaveBeenCalled();
      expect(actual.id).toBe('b1');
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
    it('zaključava otvorenu knjigu i bilježi LOCK događaj', async () => {
      prisma.incomeBook.findUnique.mockResolvedValue({
        id: 'b1',
        year: 2026,
        month: 1,
        closedAt: null,
      });
      prisma.incomeBook.update.mockResolvedValue({ id: 'b1' });

      await service.lockBook('b1', 'u1');

      const args = prisma.incomeBook.update.mock.calls[0][0];
      expect(args.data.closedAt).toBeInstanceOf(Date);
      expect(args.data.lockEvents.create.action).toBe('LOCK');
      expect(args.data.lockEvents.create.createdById).toBe('u1');
    });

    it('odbija već zaključanu knjigu', async () => {
      prisma.incomeBook.findUnique.mockResolvedValue({
        id: 'b1',
        closedAt: new Date(),
      });
      await expect(service.lockBook('b1', 'u1')).rejects.toThrow(
        BadRequestException,
      );
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
      prisma.incomeBook.findUnique.mockResolvedValue({
        id: 'b1',
        year,
        month,
        closedAt: new Date(),
      });
      prisma.incomeBook.update.mockResolvedValue({ id: 'b1' });

      await service.unlockBook('b1', 'ispravka iznosa', 'u1');

      const args = prisma.incomeBook.update.mock.calls[0][0];
      expect(args.data.closedAt).toBeNull();
      expect(args.data.lockEvents.create).toMatchObject({
        action: 'UNLOCK',
        reason: 'ispravka iznosa',
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
        .mockResolvedValueOnce(null);
      prisma.incomeBook.update.mockResolvedValue({ id: 'prev' });
      prisma.incomeBook.create.mockResolvedValue({ id: 'curr' });

      const actual = await service.openNewMonthAndClosePrevious();

      expect(actual).toEqual({ opened: 'curr', closed: 'prev' });
      const lockEvent =
        prisma.incomeBook.update.mock.calls[0][0].data.lockEvents.create;
      expect(lockEvent.action).toBe('LOCK');
      expect(lockEvent.createdById).toBeUndefined();
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
