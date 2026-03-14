import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExpenseBooksService {
  constructor(private readonly prisma: PrismaService) {}

  /** Vraća knjigu za mjesec; kreira je ako ne postoji. */
  async getOrCreateForMonth(year: number, month: number) {
    let book = await this.prisma.expenseBook.findUnique({
      where: { year_month: { year, month } },
      include: { expenses: { include: { category: true } } },
    });
    if (!book) {
      book = await this.prisma.expenseBook.create({
        data: { year, month },
        include: { expenses: { include: { category: true } } },
      });
    }
    return book;
  }

  async findAll() {
    return this.prisma.expenseBook.findMany({
      include: { _count: { select: { expenses: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async findOne(id: string) {
    const book = await this.prisma.expenseBook.findUnique({
      where: { id },
      include: { expenses: { include: { category: true, fieldValues: { include: { field: true } }, attachments: true } } },
    });
    if (!book) throw new NotFoundException('Knjiga rashoda nije pronađena.');
    return book;
  }

  async close(id: string, closedBy: string) {
    const book = await this.prisma.expenseBook.findUnique({ where: { id } });
    if (!book) throw new NotFoundException('Knjiga rashoda nije pronađena.');
    if (book.isClosed) throw new BadRequestException('Knjiga je već zatvorena.');
    return this.prisma.expenseBook.update({
      where: { id },
      data: { isClosed: true, closedAt: new Date(), closedBy },
      include: { expenses: true },
    });
  }
}
