import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'

export type PrismaTx = Prisma.TransactionClient

const manualEntryInclude = {
  service: true,
  stylistProfile: { include: { user: true } },
  client: {
    select: { id: true, username: true, firstName: true, lastName: true },
  },
  createdBy: { select: { id: true, username: true } },
} satisfies Prisma.IncomeBookManualEntryInclude

@Injectable()
export class IncomeBookRepository {
  constructor(private readonly prisma: PrismaService) {}

  get manualEntryInclude() {
    return manualEntryInclude
  }

  findById(id: string, tx?: PrismaTx) {
    return (tx ?? this.prisma).incomeBook.findUnique({ where: { id } })
  }

  async findByIdForUpdate(id: string, tx: PrismaTx) {
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM "income_books" WHERE id = ${id} FOR UPDATE`,
    )
    return this.findById(id, tx)
  }

  findByPeriod(year: number, month: number, tx?: PrismaTx) {
    return (tx ?? this.prisma).incomeBook.findUnique({
      where: { year_month: { year, month } },
    })
  }

  findByPeriodWithEntries(year: number, month: number, tx?: PrismaTx) {
    return (tx ?? this.prisma).incomeBook.findUnique({
      where: { year_month: { year, month } },
      include: { entries: true },
    })
  }

  createForPeriod(year: number, month: number, tx?: PrismaTx) {
    return (tx ?? this.prisma).incomeBook.create({
      data: { year, month },
      include: { entries: true },
    })
  }

  upsertForPeriod(year: number, month: number, tx?: PrismaTx) {
    return (tx ?? this.prisma).incomeBook.upsert({
      where: { year_month: { year, month } },
      create: { year, month },
      update: {},
      include: { entries: true },
    })
  }

  findAllOrdered() {
    return this.prisma.incomeBook.findMany({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })
  }

  findDetail(id: string) {
    return this.prisma.incomeBook.findUnique({
      where: { id },
      include: {
        entries: {
          include: {
            dailyLogEntry: {
              include: {
                service: true,
                items: {
                  include: { service: true },
                  orderBy: { sortOrder: 'asc' },
                },
                stylistProfile: { include: { user: true } },
                client: {
                  select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        manualEntries: {
          include: manualEntryInclude,
          orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        },
        lockEvents: {
          include: { createdBy: { select: { id: true, username: true } } },
          orderBy: { createdAt: 'desc' },
        },
        manualAudits: {
          include: { createdBy: { select: { id: true, username: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
  }

  async setLockState(
    id: string,
    params: {
      closedAt: Date | null
      action: 'LOCK' | 'UNLOCK'
      reason?: string
      /** Izostavljen kod automatskog zaključavanja iz CRON-a. */
      createdById?: string
    },
    options: { ignoreIfAlreadyTarget?: boolean } = {},
  ) {
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.incomeBook.updateMany({
        where: {
          id,
          closedAt: params.closedAt === null ? { not: null } : null,
        },
        data: { closedAt: params.closedAt },
      })

      if (changed.count !== 1) {
        const current = await tx.incomeBook.findUnique({ where: { id } })
        if (!current) {
          throw new NotFoundException('Knjiga prihoda nije pronađena.')
        }
        if (options.ignoreIfAlreadyTarget) return current
        return null
      }

      await tx.incomeBookLockEvent.create({
        data: {
          bookId: id,
          action: params.action,
          reason: params.reason,
          createdById: params.createdById,
        },
      })
      return tx.incomeBook.findUnique({ where: { id } })
    })
  }

  findManualEntry(id: string, tx?: PrismaTx) {
    return (tx ?? this.prisma).incomeBookManualEntry.findUnique({
      where: { id },
    })
  }

  findAutoEntryByDailyLog(dailyLogEntryId: string, tx?: PrismaTx) {
    return (tx ?? this.prisma).incomeBookEntry.findUnique({
      where: { dailyLogEntryId },
    })
  }

  /**
   * Prepisuje denormalizovane totale knjige iz stvarnih stavki.
   * Mora se pozvati unutar iste transakcije koja je mijenjala stavke,
   * inače paralelni zahtjevi upisuju zastarjele sume.
   */
  async recalculateTotals(bookId: string, tx?: PrismaTx) {
    const client = tx ?? this.prisma
    const [autoAgg, manualAgg] = await Promise.all([
      client.incomeBookEntry.aggregate({
        where: { bookId },
        _sum: { amount: true, tipAmount: true },
      }),
      client.incomeBookManualEntry.aggregate({
        where: { bookId },
        _sum: { amount: true, tipAmount: true },
      }),
    ])
    const totalRevenue =
      Number(autoAgg._sum.amount ?? 0) + Number(manualAgg._sum.amount ?? 0)
    const totalTips =
      Number(autoAgg._sum.tipAmount ?? 0) +
      Number(manualAgg._sum.tipAmount ?? 0)
    return client.incomeBook.update({
      where: { id: bookId },
      data: { totalRevenue, totalTips },
    })
  }
}
