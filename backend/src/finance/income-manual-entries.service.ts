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
import {
  assertNoSettledDebt,
  syncDebtForManualEntry,
} from './utils/manual-entry-debt.sync'
import { splitPaidAmount } from './utils/manual-entry-amounts'
import {
  ensureDateMatchesPeriod,
  parseAndNormalizeDate,
} from '../common/utils/book-period'
import type { CreateIncomeBookManualEntryDto } from './dto/create-income-book-manual-entry.dto'
import type { UpdateIncomeBookManualEntryDto } from './dto/update-income-book-manual-entry.dto'

const toSnapshot = (entry: {
  id: string
  date: Date
  serviceId: string
  stylistProfileId: string | null
  clientId: string | null
  amount: Prisma.Decimal
  tipAmount: Prisma.Decimal
  notes: string | null
}): Prisma.InputJsonObject => ({
  id: entry.id,
  date: entry.date.toISOString(),
  serviceId: entry.serviceId,
  stylistProfileId: entry.stylistProfileId,
  clientId: entry.clientId,
  amount: entry.amount.toString(),
  tipAmount: entry.tipAmount.toString(),
  notes: entry.notes,
})

@Injectable()
export class IncomeManualEntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: IncomeBookRepository,
    private readonly books: IncomeBooksService,
  ) {}

  async create(
    bookId: string,
    dto: CreateIncomeBookManualEntryDto,
    userId: string,
  ) {
    const date = parseAndNormalizeDate(dto.date)

    return this.prisma.$transaction(async (tx) => {
      const book = await this.books.getEditableBookOrThrow(
        bookId,
        'dodavanje ručnog prihoda',
        tx,
      )
      ensureDateMatchesPeriod(date, book.year, book.month)
      const servicePrice = await this.getServicePrice(dto.serviceId, tx)
      const amounts = splitPaidAmount(dto.paidAmount, servicePrice)
      const debtIntent = this.resolveDebtIntent({
        debtHandling: dto.debtHandling,
        debtAmount: amounts.debtAmount,
        clientId: dto.clientId,
        stylistProfileId: dto.stylistProfileId,
      })

      const entry = await tx.incomeBookManualEntry.create({
        data: {
          bookId,
          date,
          serviceId: dto.serviceId,
          stylistProfileId: dto.stylistProfileId,
          clientId: dto.clientId,
          amount: amounts.baseAmount,
          tipAmount: amounts.tipAmount,
          notes: dto.notes,
          createdById: userId,
        },
        include: this.repository.manualEntryInclude,
      })
      await tx.incomeBookManualEntryAudit.create({
        data: {
          bookId,
          manualEntryId: entry.id,
          action: 'CREATE',
          afterJson: {
            ...toSnapshot(entry),
            paidAmount: amounts.paidAmount,
            debtHandling: dto.debtHandling ?? null,
          },
          createdById: userId,
        },
      })
      await syncDebtForManualEntry(tx, {
        manualEntryId: entry.id,
        clientId: debtIntent.clientId,
        stylistProfileId: debtIntent.stylistProfileId,
        serviceId: dto.serviceId,
        debtAmount: debtIntent.shouldHaveDebt ? amounts.debtAmount : 0,
        note: dto.notes ?? null,
        userId,
      })
      await this.repository.recalculateTotals(bookId, tx)
      return entry
    })
  }

  async update(
    bookId: string,
    entryId: string,
    dto: UpdateIncomeBookManualEntryDto,
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const book = await this.books.getEditableBookOrThrow(
        bookId,
        'izmjena ručnog prihoda',
        tx,
      )
      const existing = await this.repository.findManualEntry(entryId, tx)
      if (!existing || existing.bookId !== bookId) {
        throw new NotFoundException('Ručni prihod nije pronađen.')
      }
      const date =
        dto.date != null ? parseAndNormalizeDate(dto.date) : existing.date
      ensureDateMatchesPeriod(date, book.year, book.month)

      const serviceId = dto.serviceId ?? existing.serviceId
      const servicePrice = await this.getServicePrice(serviceId, tx)
      const paidAmount =
        dto.paidAmount != null
          ? dto.paidAmount
          : Number(existing.amount) + Number(existing.tipAmount)
      const amounts = splitPaidAmount(paidAmount, servicePrice)
      const clientId =
        dto.clientId !== undefined ? dto.clientId : existing.clientId
      const stylistProfileId =
        dto.stylistProfileId !== undefined
          ? dto.stylistProfileId
          : existing.stylistProfileId
      const debtIntent = this.resolveDebtIntent({
        debtHandling: dto.debtHandling,
        debtAmount: amounts.debtAmount,
        clientId,
        stylistProfileId,
      })

      await assertNoSettledDebt(tx, entryId, 'izmjena stavke')
      const entry = await tx.incomeBookManualEntry.update({
        where: { id: entryId },
        data: {
          date,
          serviceId,
          stylistProfileId,
          clientId,
          amount: amounts.baseAmount,
          tipAmount: amounts.tipAmount,
          ...(dto.notes !== undefined && { notes: dto.notes }),
        },
        include: this.repository.manualEntryInclude,
      })
      await tx.incomeBookManualEntryAudit.create({
        data: {
          bookId,
          manualEntryId: entry.id,
          action: 'UPDATE',
          beforeJson: toSnapshot(existing),
          afterJson: {
            ...toSnapshot(entry),
            paidAmount: amounts.paidAmount,
            debtHandling: dto.debtHandling ?? null,
          },
          createdById: userId,
        },
      })
      await syncDebtForManualEntry(tx, {
        manualEntryId: entry.id,
        clientId: debtIntent.clientId,
        stylistProfileId: debtIntent.stylistProfileId,
        serviceId,
        debtAmount: debtIntent.shouldHaveDebt ? amounts.debtAmount : 0,
        note: dto.notes ?? null,
        userId,
      })
      await this.repository.recalculateTotals(bookId, tx)
      return entry
    })
  }

  async remove(bookId: string, entryId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.books.getEditableBookOrThrow(
        bookId,
        'brisanje ručnog prihoda',
        tx,
      )
      const existing = await this.repository.findManualEntry(entryId, tx)
      if (!existing || existing.bookId !== bookId) {
        throw new NotFoundException('Ručni prihod nije pronađen.')
      }
      await assertNoSettledDebt(tx, entryId, 'brisanje stavke')
      await syncDebtForManualEntry(tx, {
        manualEntryId: entryId,
        clientId: existing.clientId,
        stylistProfileId: existing.stylistProfileId,
        serviceId: existing.serviceId,
        debtAmount: 0,
        note: null,
        userId,
      })
      await tx.incomeBookManualEntryAudit.create({
        data: {
          bookId,
          manualEntryId: existing.id,
          action: 'DELETE',
          beforeJson: toSnapshot(existing),
          createdById: userId,
        },
      })
      await tx.incomeBookManualEntry.delete({ where: { id: entryId } })
      await this.repository.recalculateTotals(bookId, tx)
      return { deleted: true }
    })
  }

  /** Ručna stavka nastala naplatom duga – knjiži se bez novog duga. */
  async createForDebtRepayment(
    tx: PrismaTx,
    params: {
      bookId: string
      date: Date
      serviceId: string
      stylistProfileId: string
      clientId: string
      /** Veza na DEBT_PAYMENT zapis dnevnika – bez nje storniranje ostavlja stavku u KIF-u. */
      dailyLogEntryId: string
      amount: number
      notes: string
      userId: string
    },
  ) {
    const entry = await tx.incomeBookManualEntry.create({
      data: {
        bookId: params.bookId,
        date: params.date,
        serviceId: params.serviceId,
        stylistProfileId: params.stylistProfileId,
        clientId: params.clientId,
        dailyLogEntryId: params.dailyLogEntryId,
        amount: params.amount,
        tipAmount: 0,
        notes: params.notes,
        createdById: params.userId,
      },
    })
    await this.repository.recalculateTotals(params.bookId, tx)
    return entry
  }

  private async getServicePrice(
    serviceId: string,
    db: Pick<Prisma.TransactionClient, 'service'> = this.prisma,
  ): Promise<number> {
    const service = await db.service.findUnique({
      where: { id: serviceId },
      select: { price: true },
    })
    if (!service) throw new NotFoundException('Servis nije pronađen.')
    return Number(service.price)
  }

  private resolveDebtIntent(params: {
    debtHandling?: 'CREATE_DEBT' | 'IGNORE_DEBT'
    debtAmount: number
    clientId?: string | null
    stylistProfileId?: string | null
  }) {
    const shouldHaveDebt =
      params.debtHandling === 'CREATE_DEBT' && params.debtAmount > 0
    if (shouldHaveDebt && !params.clientId) {
      throw new BadRequestException('Za dug morate odabrati klijenta.')
    }
    if (shouldHaveDebt && !params.stylistProfileId) {
      throw new BadRequestException('Za dug morate odabrati stilistu.')
    }
    return {
      shouldHaveDebt,
      clientId: params.clientId ?? null,
      stylistProfileId: params.stylistProfileId ?? null,
    }
  }
}
