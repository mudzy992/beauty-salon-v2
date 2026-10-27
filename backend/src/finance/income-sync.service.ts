import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { IncomeBooksService } from './income-books.service'
import {
  IncomeBookRepository,
  type PrismaTx,
} from './repositories/income-book.repository'
import { getServiceAmount } from '../daily-log/daily-log.amounts'
import {
  assertValidPeriod,
  getBookPeriodDateBounds,
  getPeriodOfDate,
} from '../common/utils/book-period'

@Injectable()
export class IncomeSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: IncomeBookRepository,
    private readonly books: IncomeBooksService,
  ) {}

  /** Knjiga za dati datum mora postojati i biti otvorena na istom transaction clientu. */
  async assertBookOpenForDate(date: Date, tx?: PrismaTx) {
    const { year, month } = getPeriodOfDate(date)
    const book = await this.books.getOrCreateForMonth(year, month, tx)
    if (book.closedAt) {
      throw new BadRequestException('Mjesec je zaključan u KIF-u.')
    }
    return book
  }

  assertBookOpenById(bookId: string, tx?: PrismaTx) {
    return this.books.getEditableBookOrThrow(
      bookId,
      'izmjena stavki u KIF-u',
      tx,
    )
  }

  /** Resolves the target before acquiring existing-book locks in stable ID order. */
  async assertBooksOpenForDateAndIds(
    date: Date,
    relatedBookIds: string[],
    tx: PrismaTx,
  ) {
    const { year, month } = getPeriodOfDate(date)
    const targetBookId = await this.getOrCreateBookIdForPeriod(year, month, tx)
    const lockedBooks = await this.lockBooksInOrder(
      [targetBookId, ...relatedBookIds],
      tx,
    )
    const targetBook = lockedBooks.get(targetBookId)
    if (!targetBook) {
      throw new NotFoundException('Knjiga prihoda nije pronađena.')
    }
    return targetBook
  }

  /** Resolves all affected periods, then checks and locks every book in stable ID order. */
  async assertBooksOpenForDatesAndIds(
    dates: Date[],
    relatedBookIds: string[],
    tx?: PrismaTx,
  ) {
    const periods = new Map<string, { year: number; month: number }>()
    for (const date of dates) {
      const period = getPeriodOfDate(date)
      periods.set(`${period.year}-${period.month}`, period)
    }

    const targetBookIds: string[] = []
    const orderedPeriods = [...periods.values()].sort(
      (a, b) => a.year - b.year || a.month - b.month,
    )
    for (const { year, month } of orderedPeriods) {
      targetBookIds.push(await this.getOrCreateBookIdForPeriod(year, month, tx))
    }

    await this.lockBooksInOrder([...targetBookIds, ...relatedBookIds], tx)
  }

  private async getOrCreateBookIdForPeriod(
    year: number,
    month: number,
    tx?: PrismaTx,
  ) {
    assertValidPeriod(year, month)
    const db = tx ?? this.prisma
    const existing = await db.incomeBook.findUnique({
      where: { year_month: { year, month } },
      select: { id: true },
    })
    if (existing) return existing.id
    return (await this.books.getOrCreateForMonth(year, month, tx)).id
  }

  private async lockBooksInOrder(bookIds: string[], tx?: PrismaTx) {
    const lockedBooks = new Map<
      string,
      Awaited<ReturnType<IncomeBooksService['getEditableBookOrThrow']>>
    >()
    for (const bookId of [...new Set(bookIds)].sort()) {
      lockedBooks.set(bookId, await this.assertBookOpenById(bookId, tx))
    }
    return lockedBooks
  }

  recalculateTotals(bookId: string, tx?: PrismaTx) {
    return this.repository.recalculateTotals(bookId, tx)
  }

  /**
   * Knjiži završeni zapis. Kada je transaction client proslijeđen, sve čitanje,
   * kreiranje knjige/stavke i rekalkulacija ostaju unutar te transakcije.
   */
  async addEntryFromDailyLog(dailyLogEntryId: string, tx?: PrismaTx) {
    if (tx) return this.addEntryInTransaction(dailyLogEntryId, tx)
    return this.prisma.$transaction((transaction) =>
      this.addEntryInTransaction(dailyLogEntryId, transaction),
    )
  }

  private async addEntryInTransaction(
    dailyLogEntryId: string,
    tx: PrismaTx,
  ) {
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM "daily_log_entries" WHERE id = ${dailyLogEntryId} FOR UPDATE`,
    )
    const entry = await tx.dailyLogEntry.findUnique({
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

    const existing = await this.repository.findAutoEntryByDailyLog(
      dailyLogEntryId,
      tx,
    )
    if (existing) return existing

    const book = await this.assertBookOpenForDate(new Date(entry.date), tx)
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
  }

  /**
   * Detektuje razilaženje dnevnika i KIF-a: završeni zapisi mjeseca
   * koji nemaju odgovarajuću stavku u knjizi.
   */
  async checkIntegrity(bookId: string) {
    const book = await this.books.getBookOrThrow(bookId)
    const { gte: periodStart, lt: periodEnd } = getBookPeriodDateBounds(
      book.year,
      book.month,
    )

    const missing = await this.prisma.dailyLogEntry.findMany({
      where: {
        status: 'COMPLETED',
        deletedAt: null,
        kind: 'SERVICE',
        date: { gte: periodStart, lt: periodEnd },
        NOT: { incomeEntry: { is: { bookId } } },
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

  /** Read-only cross-ledger report for completed service logs in one KIF period. */
  async checkCompletionIntegrity(bookId: string) {
    const book = await this.books.getBookOrThrow(bookId)
    const { gte: periodStart, lt: periodEnd } = getBookPeriodDateBounds(
      book.year,
      book.month,
    )
    const entries = await this.prisma.dailyLogEntry.findMany({
      where: {
        status: 'COMPLETED',
        deletedAt: null,
        kind: 'SERVICE',
        date: { gte: periodStart, lt: periodEnd },
      },
      select: {
        id: true,
        date: true,
        completedAt: true,
        completionVersion: true,
        clientId: true,
        actualPrice: true,
        reservationId: true,
        stylistProfileId: true,
        reservation: {
          select: {
            id: true,
            status: true,
            completedAt: true,
            confirmedStylistId: true,
          },
        },
      },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
    })

    const kifRows = entries.length
      ? await this.prisma.incomeBookEntry.findMany({
          where: { dailyLogEntryId: { in: entries.map((entry) => entry.id) } },
          select: {
            id: true,
            bookId: true,
            dailyLogEntryId: true,
            book: { select: { year: true, month: true } },
          },
        })
      : []
    const kifByDailyLog = new Map<string, typeof kifRows>()
    for (const row of kifRows) {
      const rows = kifByDailyLog.get(row.dailyLogEntryId) ?? []
      rows.push(row)
      kifByDailyLog.set(row.dailyLogEntryId, rows)
    }

    const sources = entries.map((entry) => `daily_log:${entry.id}`)
    const earnRows = sources.length
      ? await this.prisma.loyaltyTransaction.findMany({
          where: { type: 'EARN', source: { in: sources } },
          select: {
            id: true,
            source: true,
            idempotencyKey: true,
            accountId: true,
            points: true,
          },
        })
      : []
    const earnBySource = new Map<string, typeof earnRows>()
    for (const row of earnRows) {
      if (!row.source) continue
      const rows = earnBySource.get(row.source) ?? []
      rows.push(row)
      earnBySource.set(row.source, rows)
    }

    const missingKif: Array<{ id: string; date: Date }> = []
    const duplicateKif: Array<{
      id: string
      date: Date
      incomeEntryIds: string[]
      bookIds: string[]
    }> = []
    const wrongPeriodKif: Array<{
      id: string
      date: Date
      incomeEntryIds: string[]
      bookIds: string[]
    }> = []
    const missingCompletionTimestamp: Array<{ id: string; date: Date }> = []
    const reservationMismatch: Array<{
      id: string
      reservationId: string
      reservationStatus: string | null
      reservationStylistProfileId: string | null
      hasCompletedAt: boolean
    }> = []
    const loyaltyNoEarnFound: Array<{
      id: string
      completionVersion: number
      observedEarnKeys: Array<string | null>
      eligibility: 'NOT_EVALUATED'
    }> = []
    const duplicateLoyaltyEarn: Array<{
      source: string
      transactionIds: string[]
      idempotencyKeys: Array<string | null>
    }> = []
    const loyaltyUnkeyed: Array<{ source: string; transactionIds: string[] }> = []

    for (const entry of entries) {
      const entryKifRows = kifByDailyLog.get(entry.id) ?? []
      if (entryKifRows.length === 0) {
        missingKif.push({ id: entry.id, date: entry.date })
      } else if (entryKifRows.length > 1) {
        duplicateKif.push({
          id: entry.id,
          date: entry.date,
          incomeEntryIds: entryKifRows.map((row) => row.id),
          bookIds: entryKifRows.map((row) => row.bookId),
        })
      }
      const entryPeriod = getPeriodOfDate(new Date(entry.date))
      const wrongPeriodRows = entryKifRows.filter(
        (row) =>
          row.book.year !== entryPeriod.year ||
          row.book.month !== entryPeriod.month,
      )
      if (wrongPeriodRows.length > 0) {
        wrongPeriodKif.push({
          id: entry.id,
          date: entry.date,
          incomeEntryIds: wrongPeriodRows.map((row) => row.id),
          bookIds: wrongPeriodRows.map((row) => row.bookId),
        })
      }
      if (!entry.completedAt) {
        missingCompletionTimestamp.push({ id: entry.id, date: entry.date })
      }
      if (
        entry.reservationId &&
        (!entry.reservation ||
          entry.reservation.status !== 'COMPLETED' ||
          !entry.reservation.completedAt ||
          entry.reservation.confirmedStylistId !== entry.stylistProfileId)
      ) {
        reservationMismatch.push({
          id: entry.id,
          reservationId: entry.reservationId,
          reservationStatus: entry.reservation?.status ?? null,
          reservationStylistProfileId:
            entry.reservation?.confirmedStylistId ?? null,
          hasCompletedAt: Boolean(entry.reservation?.completedAt),
        })
      }

      const source = `daily_log:${entry.id}`
      const rows = earnBySource.get(source) ?? []
      const generation = Math.max(1, entry.completionVersion)
      const expectedKey = `daily-log.earn:${entry.id}:v${generation}`
      const currentGenerationRows = rows.filter(
        (row) => row.idempotencyKey === expectedKey,
      )
      const unkeyedRows = rows.filter((row) => !row.idempotencyKey)
      if (rows.length > 1) {
        duplicateLoyaltyEarn.push({
          source,
          transactionIds: rows.map((row) => row.id),
          idempotencyKeys: rows.map((row) => row.idempotencyKey),
        })
      }
      if (unkeyedRows.length > 0) {
        loyaltyUnkeyed.push({
          source,
          transactionIds: unkeyedRows.map((row) => row.id),
        })
      }
      if (
        entry.clientId &&
        Number(entry.actualPrice) > 0 &&
        currentGenerationRows.length === 0
      ) {
        loyaltyNoEarnFound.push({
          id: entry.id,
          completionVersion: generation,
          observedEarnKeys: rows.map((row) => row.idempotencyKey),
          eligibility: 'NOT_EVALUATED',
        })
      }
    }

    const bookIntegrity = await this.checkIntegrity(bookId)
    const counts = {
      scanned: entries.length,
      missingKif: missingKif.length,
      duplicateKif: duplicateKif.length,
      wrongPeriodKif: wrongPeriodKif.length,
      orphanedKif: bookIntegrity.orphanedCount,
      missingCompletionTimestamp: missingCompletionTimestamp.length,
      reservationMismatch: reservationMismatch.length,
      loyaltyNoEarnFound: loyaltyNoEarnFound.length,
      duplicateLoyaltyEarn: duplicateLoyaltyEarn.length,
      loyaltyUnkeyed: loyaltyUnkeyed.length,
    }
    const isHealthy = Object.entries(counts).every(
      ([key, value]) =>
        key === 'scanned' || key === 'loyaltyNoEarnFound' || value === 0,
    )
    const needsReview = loyaltyNoEarnFound.length > 0

    return {
      bookId,
      year: book.year,
      month: book.month,
      isReadOnly: true,
      isHealthy,
      needsReview,
      counts,
      caveats: [
        'Loyalty bez EARN reda je kandidat za provjeru, ne dokaz da su tadašnji loyalty uslovi bili ispunjeni.',
        'Izvještaj ne mijenja daily-log, KIF, loyalty ili outbox podatke.',
      ],
      missingKif,
      duplicateKif,
      wrongPeriodKif,
      orphanedKif: bookIntegrity.orphaned,
      missingCompletionTimestamp,
      reservationMismatch,
      loyaltyNoEarnFound,
      duplicateLoyaltyEarn,
      loyaltyUnkeyed,
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
    const missingIds = report.missing.map((entry) => entry.id)
    if (missingIds.length > 0) {
      const existingRows = await this.prisma.incomeBookEntry.findMany({
        where: { dailyLogEntryId: { in: missingIds } },
        select: { dailyLogEntryId: true },
      })
      if (existingRows.length > 0) {
        throw new BadRequestException(
          'Neki zapisi već imaju KIF stavku u drugoj knjizi; pregledajte read-only completion-integrity izvještaj prije popravke.',
        )
      }
    }
    const results = await Promise.allSettled(
      report.missing.map((entry) => this.addEntryFromDailyLog(entry.id)),
    )
    const synced = results.filter((r) => r.status === 'fulfilled').length
    return { synced, failed: results.length - synced }
  }
}
