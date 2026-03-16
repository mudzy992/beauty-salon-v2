import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IncomeBooksService {
  constructor(private readonly prisma: PrismaService) {}

  /** CRON: 1. u mjesecu – otvori novu knjigu prihoda, zatvori prethodnu. */
  async openNewMonthAndClosePrevious() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12
    const prev =
      month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };

    const prevBook = await this.prisma.incomeBook.findUnique({
      where: { year_month: { year: prev.year, month: prev.month } },
    });
    if (prevBook && !prevBook.closedAt) {
      await this.prisma.incomeBook.update({
        where: { id: prevBook.id },
        data: { closedAt: new Date() },
      });
    }

    let currentBook = await this.prisma.incomeBook.findUnique({
      where: { year_month: { year, month } },
    });
    if (!currentBook) {
      currentBook = await this.prisma.incomeBook.create({
        data: { year, month },
      });
    }
    return { opened: currentBook.id, closed: prevBook?.id };
  }

  /** Vraća knjigu za mjesec; kreira je ako ne postoji (za agregaciju). */
  async getOrCreateForMonth(year: number, month: number) {
    let book = await this.prisma.incomeBook.findUnique({
      where: { year_month: { year, month } },
      include: { entries: true },
    });
    if (!book) {
      book = await this.prisma.incomeBook.create({
        data: { year, month },
        include: { entries: true },
      });
    }
    return book;
  }

  async findAll() {
    return this.prisma.incomeBook.findMany({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async findOne(id: string) {
    const book = await this.prisma.incomeBook.findUnique({
      where: { id },
      include: {
        entries: {
          include: {
            dailyLogEntry: {
              include: {
                service: true,
                stylistProfile: { include: { user: true } },
              },
            },
          },
        },
      },
    });
    if (!book) throw new NotFoundException('Knjiga prihoda nije pronađena.');
    return book;
  }

  /** Dodaje zapis iz daily log u knjigu prihoda (poziva se pri complete daily log ili ručno sync). */
  async addEntryFromDailyLog(dailyLogEntryId: string) {
    const entry = await this.prisma.dailyLogEntry.findUnique({
      where: { id: dailyLogEntryId },
    });
    if (!entry) throw new NotFoundException('Zapis dnevnika nije pronađen.');
    if (entry.status !== 'COMPLETED')
      throw new Error('Samo završeni zapisi se dodaju u knjigu prihoda.');
    const d = new Date(entry.date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const book = await this.getOrCreateForMonth(year, month);
    const existing = await this.prisma.incomeBookEntry.findUnique({
      where: { bookId_dailyLogEntryId: { bookId: book.id, dailyLogEntryId } },
    });
    if (existing) return existing;
    const created = await this.prisma.incomeBookEntry.create({
      data: {
        bookId: book.id,
        dailyLogEntryId,
        amount: entry.actualPrice,
        tipAmount: entry.tipAmount,
        date: entry.date,
      },
    });
    await this.recalculateTotals(book.id);
    return this.prisma.incomeBookEntry.findUnique({
      where: { id: created.id },
      include: { dailyLogEntry: true },
    });
  }

  private async recalculateTotals(bookId: string) {
    const agg = await this.prisma.incomeBookEntry.aggregate({
      where: { bookId },
      _sum: { amount: true, tipAmount: true },
    });
    const totalRevenue = Number(agg._sum.amount ?? 0);
    const totalTips = Number(agg._sum.tipAmount ?? 0);
    await this.prisma.incomeBook.update({
      where: { id: bookId },
      data: { totalRevenue, totalTips },
    });
  }
}
