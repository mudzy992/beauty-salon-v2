import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertValidPeriod,
  isFutureMonth,
  isPastMonth,
} from '../common/utils/book-period';
import {
  expenseBookDetailInclude,
  expenseBookExpensesInclude,
} from './utils/expense-book-include';
import { withTotalExpenses } from './utils/expense-book-totals';

@Injectable()
export class ExpenseBooksService {
  constructor(private readonly prisma: PrismaService) {}

  /** Vraća knjigu za mjesec; kreira je ako ne postoji. */
  async getOrCreateForMonth(year: number, month: number) {
    assertValidPeriod(year, month);
    if (isFutureMonth(year, month)) {
      throw new BadRequestException('Ne možete kreirati knjigu za budući mjesec.');
    }
    let book = await this.prisma.expenseBook.findUnique({
      where: { year_month: { year, month } },
      include: expenseBookExpensesInclude,
    });
    if (!book) {
      book = await this.prisma.expenseBook.create({
        data: { year, month },
        include: expenseBookExpensesInclude,
      });
    }
    return withTotalExpenses(book);
  }

  async findAll() {
    const books = await this.prisma.expenseBook.findMany({
      include: { _count: { select: { expenses: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    const sums = await this.prisma.expense.groupBy({
      by: ['bookId'],
      _sum: { totalAmount: true },
    });
    const totalByBookId = new Map<string, number>(
      sums.map((s) => [s.bookId, Number(s._sum.totalAmount ?? 0)]),
    );
    return books.map((b) => ({
      ...b,
      totalExpenses: totalByBookId.get(b.id) ?? 0,
    }));
  }

  async findOne(id: string) {
    const book = await this.prisma.expenseBook.findUnique({
      where: { id },
      include: expenseBookDetailInclude,
    });
    if (!book) throw new NotFoundException('Knjiga rashoda nije pronađena.');
    return withTotalExpenses(book);
  }

  async close(id: string, closedBy: string) {
    return this.lockBook(id, closedBy);
  }

  async unlockBook(id: string, reason: string, userId: string) {
    const trimmedReason = reason?.trim();
    if (!trimmedReason) {
      throw new BadRequestException('Morate unijeti razlog otključavanja.');
    }
    if (trimmedReason.length > 2000) {
      throw new BadRequestException('Razlog otključavanja je predugačak.');
    }

    const unlocked = await this.prisma.$transaction(async (tx) => {
      const book = await tx.expenseBook.findUnique({
        where: { id },
        select: { id: true, year: true, month: true, isClosed: true },
      });
      if (!book) throw new NotFoundException('Knjiga rashoda nije pronađena.');
      if (!book.isClosed) {
        throw new BadRequestException('Knjiga je već otključana.');
      }
      if (!isPastMonth(book.year, book.month)) {
        throw new BadRequestException(
          'Otključavanje je dozvoljeno samo za knjige iz prošlosti.',
        );
      }

      const changed = await tx.expenseBook.updateMany({
        where: { id, isClosed: true },
        data: { isClosed: false, closedAt: null },
      });
      if (changed.count !== 1) {
        const current = await tx.expenseBook.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!current) {
          throw new NotFoundException('Knjiga rashoda nije pronađena.');
        }
        throw new BadRequestException('Knjiga je već otključana.');
      }

      await tx.expenseBookLockEvent.create({
        data: {
          bookId: id,
          action: 'UNLOCK',
          reason: trimmedReason,
          createdById: userId,
        },
      });
      return tx.expenseBook.findUnique({
        where: { id },
        include: expenseBookDetailInclude,
      });
    });
    if (!unlocked) {
      throw new NotFoundException('Knjiga rashoda nije pronađena.');
    }
    return withTotalExpenses(unlocked);
  }

  async lockBook(id: string, userId: string) {
    const lockedAt = new Date();
    const locked = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.expenseBook.updateMany({
        where: { id, isClosed: false },
        data: { isClosed: true, closedAt: lockedAt, closedBy: userId },
      });
      if (changed.count !== 1) {
        const current = await tx.expenseBook.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!current) {
          throw new NotFoundException('Knjiga rashoda nije pronađena.');
        }
        throw new BadRequestException('Knjiga je već zaključana.');
      }

      await tx.expenseBookLockEvent.create({
        data: { bookId: id, action: 'LOCK', createdById: userId },
      });
      return tx.expenseBook.findUnique({
        where: { id },
        include: expenseBookDetailInclude,
      });
    });
    if (!locked) throw new NotFoundException('Knjiga rashoda nije pronađena.');
    return withTotalExpenses(locked);
  }
}
