import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { IncomeBooksService } from './income-books.service'
import {
  IncomeBookRepository,
  type PrismaTx,
} from './repositories/income-book.repository'
import { getServiceAmount } from '../daily-log/daily-log.amounts'
import { getPeriodOfDate } from '../common/utils/book-period'

@Injectable()
export class IncomeSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: IncomeBookRepository,
    private readonly books: IncomeBooksService,
  ) {}

  /** Knjiga za dati datum mora postojati i biti otvorena. */
  async assertBookOpenForDate(date: Date): Promise<{ id: string }> {
    const { year, month } = getPeriodOfDate(date)
    const book = await this.books.getOrCreateForMonth(year, month)
    if (book.closedAt) {
      throw new BadRequestException('Mjesec je zaključan u KIF-u.')
    }
    return book
  }

  recalculateTotals(bookId: string, tx?: PrismaTx) {
    return this.repository.recalculateTotals(bookId, tx)
  }

  /** Knjiži završeni zapis dnevnika u KIF (poziva se pri complete ili ručnom sync-u). */
  async addEntryFromDailyLog(dailyLogEntryId: string) {
    const entry = await this.prisma.dailyLogEntry.findUnique({
      where: { id: dailyLogEntryId },
    })
    if (!entry) throw new NotFoundException('Zapis dnevnika nije pronađen.')
    if (entry.deletedAt) {
      throw new BadRequestException('Obrisani zapis se ne knjiži u KIF.')
    }
    if (entry.status !== 'COMPLETED') {
      throw new BadRequestException(
        'Samo završeni zapisi se dodaju u knjigu prihoda.',
      )
    }
    if (entry.kind === 'DEBT_PAYMENT') {
      // Naplata duga se knjiži kao zasebna ručna stavka, ne kroz auto agregaciju.
      return null
    }

    const book = await this.assertBookOpenForDate(new Date(entry.date))
    const existing = await this.repository.findAutoEntryByDailyLog(
      book.id,
      dailyLogEntryId,
    )
    if (existing) return existing

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.incomeBookEntry.create({
        data: {
          bookId: book.id,
          dailyLogEntryId,
          amount: getServiceAmount(entry.actualPrice, entry.tipAmount),
          tipAmount: entry.tipAmount,
          date: entry.date,
        },
        include: { dailyLogEntry: true },
      })
      await this.repository.recalculateTotals(book.id, tx)
      return created
    })
  }

  /**
   * Detektuje razilaženje dnevnika i KIF-a: završeni zapisi mjeseca
   * koji nemaju odgovarajuću stavku u knjizi.
   */
  async checkIntegrity(bookId: string) {
    const book = await this.books.getBookOrThrow(bookId)
    const periodStart = new Date(book.year, book.month - 1, 1)
    const periodEnd = new Date(book.year, book.month, 1)

    const missing = await this.prisma.dailyLogEntry.findMany({
      where: {
        status: 'COMPLETED',
        deletedAt: null,
        kind: 'SERVICE',
        date: { gte: periodStart, lt: periodEnd },
        incomeEntries: { none: { bookId } },
      },
      select: {
        id: true,
        date: true,
        actualPrice: true,
        tipAmount: true,
        service: { select: { id: true, name: true } },
        stylistProfile: {
          include: {
            user: { select: { id: true, username: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { date: 'asc' },
    })

    const orphaned = await this.prisma.incomeBookEntry.findMany({
      where: {
        bookId,
        OR: [
          { dailyLogEntry: { deletedAt: { not: null } } },
          { dailyLogEntry: { status: { not: 'COMPLETED' } } },
        ],
      },
      select: { id: true, date: true, amount: true, dailyLogEntryId: true },
      orderBy: { date: 'asc' },
    })

    return {
      bookId,
      isLocked: Boolean(book.closedAt),
      missingCount: missing.length,
      orphanedCount: orphaned.length,
      isHealthy: missing.length === 0 && orphaned.length === 0,
      missing,
      orphaned,
    }
  }

  /** Naknadno knjiži sve nedostajuće zapise mjeseca. */
  async resyncBook(bookId: string) {
    const report = await this.checkIntegrity(bookId)
    if (report.isLocked) {
      throw new BadRequestException(
        'Knjiga je zaključana – ponovna sinhronizacija nije moguća.',
      )
    }
    const results = await Promise.allSettled(
      report.missing.map((entry) => this.addEntryFromDailyLog(entry.id)),
    )
    const synced = results.filter((r) => r.status === 'fulfilled').length
    return { synced, failed: results.length - synced }
  }
}
