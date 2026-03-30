import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
        manualEntries: {
          include: {
            service: true,
            stylistProfile: { include: { user: true } },
            client: { select: { id: true, username: true, firstName: true, lastName: true } },
            createdBy: { select: { id: true, username: true } },
          },
          orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        },
        lockEvents: {
          include: { createdBy: { select: { id: true, username: true } } },
          orderBy: { createdAt: 'desc' },
        },
        manualAudits: {
          include: {
            createdBy: { select: { id: true, username: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!book) throw new NotFoundException('Knjiga prihoda nije pronađena.');
    return book;
  }

  async unlockBook(id: string, reason: string, userId: string) {
    const trimmedReason = reason?.trim();
    if (!trimmedReason)
      throw new BadRequestException('Morate unijeti razlog otključavanja.');
    if (trimmedReason.length > 2000)
      throw new BadRequestException('Razlog otključavanja je predugačak.');
    const book = await this.prisma.incomeBook.findUnique({ where: { id } });
    if (!book) throw new NotFoundException('Knjiga prihoda nije pronađena.');
    if (!book.closedAt)
      throw new BadRequestException('Knjiga je već otključana.');
    if (!this.isPastMonth(book.year, book.month)) {
      throw new BadRequestException(
        'Otključavanje je dozvoljeno samo za knjige iz prošlosti.',
      );
    }
    const updated = await this.prisma.incomeBook.update({
      where: { id },
      data: {
        closedAt: null,
        lockEvents: {
          create: {
            action: 'UNLOCK',
            reason: trimmedReason,
            createdById: userId,
          },
        },
      },
    });
    return updated;
  }

  async lockBook(id: string, userId: string) {
    const book = await this.prisma.incomeBook.findUnique({ where: { id } });
    if (!book) throw new NotFoundException('Knjiga prihoda nije pronađena.');
    if (book.closedAt)
      throw new BadRequestException('Knjiga je već zaključana.');
    const updated = await this.prisma.incomeBook.update({
      where: { id },
      data: {
        closedAt: new Date(),
        lockEvents: {
          create: {
            action: 'LOCK',
            createdById: userId,
          },
        },
      },
    });
    return updated;
  }

  async createManualEntry(
    bookId: string,
    dto: {
      date: string;
      serviceId: string;
      stylistProfileId?: string;
      clientId?: string;
      amount: number;
      tipAmount?: number;
      notes?: string;
    },
    userId: string,
  ) {
    const book = await this.prisma.incomeBook.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException('Knjiga prihoda nije pronađena.');
    if (book.closedAt)
      throw new BadRequestException(
        'Ne možete dodavati ručne prihode u zaključanu knjigu.',
      );
    if (!this.isPastMonth(book.year, book.month))
      throw new BadRequestException(
        'Ručni prihodi su dozvoljeni samo za knjige iz prošlosti.',
      );
    const date = this.parseAndNormalizeDate(dto.date);
    this.ensureDateMatchesBookMonth(date, book.year, book.month);
    const tipAmount = dto.tipAmount ?? 0;
    const created = await this.prisma.$transaction(async (tx) => {
      const entry = await tx.incomeBookManualEntry.create({
        data: {
          bookId,
          date,
          serviceId: dto.serviceId,
          stylistProfileId: dto.stylistProfileId,
          clientId: dto.clientId,
          amount: dto.amount,
          tipAmount,
          notes: dto.notes,
          createdById: userId,
        },
        include: {
          service: true,
          stylistProfile: { include: { user: true } },
          client: { select: { id: true, username: true, firstName: true, lastName: true } },
          createdBy: { select: { id: true, username: true } },
        },
      });
      await tx.incomeBookManualEntryAudit.create({
        data: {
          bookId,
          manualEntryId: entry.id,
          action: 'CREATE',
          beforeJson: undefined,
          afterJson: {
            id: entry.id,
            date: entry.date,
            serviceId: entry.serviceId,
            stylistProfileId: entry.stylistProfileId,
            clientId: entry.clientId,
            amount: entry.amount,
            tipAmount: entry.tipAmount,
            notes: entry.notes,
          },
          createdById: userId,
        },
      });
      return entry;
    });
    await this.recalculateTotals(bookId);
    return created;
  }

  async updateManualEntry(
    bookId: string,
    entryId: string,
    dto: {
      date?: string;
      serviceId?: string;
      stylistProfileId?: string | null;
      clientId?: string | null;
      amount?: number;
      tipAmount?: number;
      notes?: string | null;
    },
    userId: string,
  ) {
    const book = await this.prisma.incomeBook.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException('Knjiga prihoda nije pronađena.');
    if (book.closedAt)
      throw new BadRequestException(
        'Ne možete mijenjati ručne prihode u zaključanoj knjizi.',
      );
    if (!this.isPastMonth(book.year, book.month))
      throw new BadRequestException(
        'Ručni prihodi su dozvoljeni samo za knjige iz prošlosti.',
      );
    const existing = await this.prisma.incomeBookManualEntry.findUnique({
      where: { id: entryId },
    });
    if (!existing || existing.bookId !== bookId)
      throw new NotFoundException('Ručni prihod nije pronađen.');
    const nextDate =
      dto.date != null ? this.parseAndNormalizeDate(dto.date) : existing.date;
    this.ensureDateMatchesBookMonth(nextDate, book.year, book.month);
    const updated = await this.prisma.$transaction(async (tx) => {
      const entry = await tx.incomeBookManualEntry.update({
        where: { id: entryId },
        data: {
          ...(dto.date != null && { date: nextDate }),
          ...(dto.serviceId != null && { serviceId: dto.serviceId }),
          ...(dto.stylistProfileId !== undefined && {
            stylistProfileId: dto.stylistProfileId,
          }),
          ...(dto.clientId !== undefined && { clientId: dto.clientId }),
          ...(dto.amount != null && { amount: dto.amount }),
          ...(dto.tipAmount != null && { tipAmount: dto.tipAmount }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
        },
        include: {
          service: true,
          stylistProfile: { include: { user: true } },
          client: { select: { id: true, username: true, firstName: true, lastName: true } },
          createdBy: { select: { id: true, username: true } },
        },
      });
      await tx.incomeBookManualEntryAudit.create({
        data: {
          bookId,
          manualEntryId: entry.id,
          action: 'UPDATE',
          beforeJson: {
            id: existing.id,
            date: existing.date,
            serviceId: existing.serviceId,
            stylistProfileId: existing.stylistProfileId,
            clientId: existing.clientId,
            amount: existing.amount,
            tipAmount: existing.tipAmount,
            notes: existing.notes,
          },
          afterJson: {
            id: entry.id,
            date: entry.date,
            serviceId: entry.serviceId,
            stylistProfileId: entry.stylistProfileId,
            clientId: entry.clientId,
            amount: entry.amount,
            tipAmount: entry.tipAmount,
            notes: entry.notes,
          },
          createdById: userId,
        },
      });
      return entry;
    });
    await this.recalculateTotals(bookId);
    return updated;
  }

  async deleteManualEntry(bookId: string, entryId: string, userId: string) {
    const book = await this.prisma.incomeBook.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException('Knjiga prihoda nije pronađena.');
    if (book.closedAt)
      throw new BadRequestException(
        'Ne možete brisati ručne prihode iz zaključane knjige.',
      );
    if (!this.isPastMonth(book.year, book.month))
      throw new BadRequestException(
        'Ručni prihodi su dozvoljeni samo za knjige iz prošlosti.',
      );
    const existing = await this.prisma.incomeBookManualEntry.findUnique({
      where: { id: entryId },
    });
    if (!existing || existing.bookId !== bookId)
      throw new NotFoundException('Ručni prihod nije pronađen.');
    await this.prisma.$transaction(async (tx) => {
      await tx.incomeBookManualEntryAudit.create({
        data: {
          bookId,
          manualEntryId: existing.id,
          action: 'DELETE',
          beforeJson: {
            id: existing.id,
            date: existing.date,
            serviceId: existing.serviceId,
            stylistProfileId: existing.stylistProfileId,
            clientId: existing.clientId,
            amount: existing.amount,
            tipAmount: existing.tipAmount,
            notes: existing.notes,
          },
          afterJson: undefined,
          createdById: userId,
        },
      });
      await tx.incomeBookManualEntry.delete({ where: { id: entryId } });
    });
    await this.recalculateTotals(bookId);
    return { deleted: true };
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
    const autoAgg = await this.prisma.incomeBookEntry.aggregate({
      where: { bookId },
      _sum: { amount: true, tipAmount: true },
    });
    const manualAgg = await this.prisma.incomeBookManualEntry.aggregate({
      where: { bookId },
      _sum: { amount: true, tipAmount: true },
    });
    const totalRevenue =
      Number(autoAgg._sum.amount ?? 0) + Number(manualAgg._sum.amount ?? 0);
    const totalTips =
      Number(autoAgg._sum.tipAmount ?? 0) +
      Number(manualAgg._sum.tipAmount ?? 0);
    await this.prisma.incomeBook.update({
      where: { id: bookId },
      data: { totalRevenue, totalTips },
    });
  }

  private isPastMonth(year: number, month: number): boolean {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    if (year < currentYear) return true;
    if (year > currentYear) return false;
    return month < currentMonth;
  }

  private parseAndNormalizeDate(value: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
      throw new BadRequestException('Datum nije validan.');
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private ensureDateMatchesBookMonth(date: Date, year: number, month: number) {
    const dYear = date.getFullYear();
    const dMonth = date.getMonth() + 1;
    if (dYear !== year || dMonth !== month) {
      throw new BadRequestException(
        'Datum ručnog prihoda mora biti unutar mjeseca knjige.',
      );
    }
  }
}
