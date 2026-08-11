import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
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

  findByPeriod(year: number, month: number) {
    return this.prisma.incomeBook.findUnique({
      where: { year_month: { year, month } },
    })
  }

  findByPeriodWithEntries(year: number, month: number) {
    return this.prisma.incomeBook.findUnique({
      where: { year_month: { year, month } },
      include: { entries: true },
    })
  }

  createForPeriod(year: number, month: number) {
    return this.prisma.incomeBook.create({
      data: { year, month },
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

  setLockState(
    id: string,
    params: {
      closedAt: Date | null
      action: 'LOCK' | 'UNLOCK'
      reason?: string
      /** Izostavljen kod automatskog zaključavanja iz CRON-a. */
      createdById?: string
    },
    tx?: PrismaTx,
  ) {
    return (tx ?? this.prisma).incomeBook.update({
      where: { id },
      data: {
        closedAt: params.closedAt,
        lockEvents: {
          create: {
            action: params.action,
            reason: params.reason,
            createdById: params.createdById,
          },
        },
      },
    })
  }

  findManualEntry(id: string, tx?: PrismaTx) {
    return (tx ?? this.prisma).incomeBookManualEntry.findUnique({
      where: { id },
    })
  }

  findAutoEntryByDailyLog(bookId: string, dailyLogEntryId: string) {
    return this.prisma.incomeBookEntry.findUnique({
      where: { bookId_dailyLogEntryId: { bookId, dailyLogEntryId } },
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
