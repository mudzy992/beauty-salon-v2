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
    const book = await this.prisma.expenseBook.findUnique({ where: { id } });
    if (!book) throw new NotFoundException('Knjiga rashoda nije pronađena.');
    if (!book.isClosed) {
      throw new BadRequestException('Knjiga je već otključana.');
    }
    if (!isPastMonth(book.year, book.month)) {
      throw new BadRequestException('Otključavanje je dozvoljeno samo za knjige iz prošlosti.');
    }
    const unlocked = await this.prisma.expenseBook.update({
      where: { id },
      data: {
        isClosed: false,
        closedAt: null,
        lockEvents: {
          create: { action: 'UNLOCK', reason: trimmedReason, createdById: userId },
        },
      },
      include: expenseBookDetailInclude,
    });
    return withTotalExpenses(unlocked);
  }

  async lockBook(id: string, userId: string) {
    const book = await this.prisma.expenseBook.findUnique({ where: { id } });
    if (!book) throw new NotFoundException('Knjiga rashoda nije pronađena.');
    if (book.isClosed) {
      throw new BadRequestException('Knjiga je već zaključana.');
    }
    const locked = await this.prisma.expenseBook.update({
      where: { id },
      data: {
        isClosed: true,
        closedAt: new Date(),
        closedBy: userId,
        lockEvents: { create: { action: 'LOCK', createdById: userId } },
      },
      include: expenseBookDetailInclude,
    });
    return withTotalExpenses(locked);
  }
}
