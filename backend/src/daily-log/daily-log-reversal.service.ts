import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IncomeSyncService } from '../finance/income-sync.service';
import { IncomeBookRepository } from '../finance/repositories/income-book.repository';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { getServiceAmount } from './daily-log.amounts';

type TxClient = Prisma.TransactionClient;

@Injectable()
export class DailyLogReversalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly incomeSync: IncomeSyncService,
    private readonly incomeBookRepository: IncomeBookRepository,
    private readonly loyalty: LoyaltyService,
  ) {}

  async assertOpenBooksForEntry(entry: {
    date: Date;
    id: string;
  }): Promise<void> {
    await this.incomeSync.assertBookOpenForDate(new Date(entry.date));
    const debtPayments = await this.prisma.dailyLogEntry.findMany({
      where: { sourceEntryId: entry.id, deletedAt: null },
      select: { date: true },
    });
    for (const dp of debtPayments) {
      await this.incomeSync.assertBookOpenForDate(new Date(dp.date));
    }
  }

  /** Full side-effect undo for COMPLETED entry (KIF, loyalty, debts, reservation). */
  async reverseCompletedEffects(
    entryId: string,
    opts?: { revertReservation?: boolean },
  ): Promise<void> {
    const entry = await this.prisma.dailyLogEntry.findUnique({
      where: { id: entryId },
    });
    if (!entry || entry.status !== 'COMPLETED') return;
    await this.assertOpenBooksForEntry(entry);
    await this.prisma.$transaction(async (tx) => {
      await this.removeIncomeBookEntries(tx, entryId);
      await this.reverseLinkedDebtPayments(tx, entryId);
      await this.removeCreatedDebts(tx, entryId);
      if (opts?.revertReservation !== false && entry.reservationId) {
        await this.revertReservationIfCompleted(tx, entry.reservationId);
      }
    });
    await this.loyalty.reverseFromDailyLog(entryId).catch(() => {});
  }

  async syncIncomeBookEntry(entry: {
    id: string;
    date: Date;
    actualPrice: unknown;
    tipAmount: unknown;
    status: string;
    kind: string;
    deletedAt: Date | null;
  }): Promise<void> {
    if (entry.status !== 'COMPLETED' || entry.deletedAt || entry.kind === 'DEBT_PAYMENT') {
      return;
    }
    const book = await this.incomeSync.assertBookOpenForDate(new Date(entry.date));
    const existing = await this.prisma.incomeBookEntry.findFirst({
      where: { dailyLogEntryId: entry.id },
    });
    if (!existing) {
      await this.incomeSync.addEntryFromDailyLog(entry.id);
      return;
    }
    const data = {
      amount: getServiceAmount(entry.actualPrice, entry.tipAmount),
      tipAmount: entry.tipAmount as Prisma.Decimal,
      date: entry.date,
    };
    await this.prisma.$transaction(async (tx) => {
      if (existing.bookId !== book.id) {
        await tx.incomeBookEntry.delete({ where: { id: existing.id } });
        await this.recalcInTx(tx, existing.bookId);
        await tx.incomeBookEntry.create({
          data: { bookId: book.id, dailyLogEntryId: entry.id, ...data },
        });
      } else {
        await tx.incomeBookEntry.update({ where: { id: existing.id }, data });
      }
      await this.recalcInTx(tx, book.id);
    });
  }

  private async removeIncomeBookEntries(
    tx: TxClient,
    dailyLogEntryId: string,
  ): Promise<void> {
    const entries = await tx.incomeBookEntry.findMany({
      where: { dailyLogEntryId },
      select: { id: true, bookId: true },
    });
    if (entries.length === 0) return;
    const bookIds = [...new Set(entries.map((e) => e.bookId))];
    await tx.incomeBookEntry.deleteMany({ where: { dailyLogEntryId } });
    for (const bookId of bookIds) {
      await this.recalcInTx(tx, bookId);
    }
  }

  /** Soft-delete linked DEBT_PAYMENT rows and reopen settled debts. */
  async reverseLinkedDebtPayments(
    tx: TxClient,
    sourceEntryId: string,
  ): Promise<void> {
    const debtPayments = await tx.dailyLogEntry.findMany({
      where: {
        sourceEntryId,
        kind: 'DEBT_PAYMENT',
        deletedAt: null,
      },
      select: { id: true, debtId: true },
    });
    for (const dp of debtPayments) {
      const manuals = await tx.incomeBookManualEntry.findMany({
        where: { dailyLogEntryId: dp.id },
        select: { id: true, bookId: true },
      });
      const bookIds = [...new Set(manuals.map((m) => m.bookId))];
      await tx.incomeBookManualEntry.deleteMany({
        where: { dailyLogEntryId: dp.id },
      });
      for (const bookId of bookIds) {
        await this.recalcInTx(tx, bookId);
      }
      if (dp.debtId) {
        await tx.clientDebt.update({
          where: { id: dp.debtId },
          data: {
            status: 'OPEN',
            settledAt: null,
            settledById: null,
          },
        });
      }
      await tx.dailyLogEntry.update({
        where: { id: dp.id },
        data: {
          deletedAt: new Date(),
          deleteReason: 'Reversal of source entry',
        },
      });
    }
  }

  private async removeCreatedDebts(
    tx: TxClient,
    dailyLogEntryId: string,
  ): Promise<void> {
    await tx.clientDebt.deleteMany({
      where: { dailyLogEntryId, status: 'OPEN' },
    });
  }

  private async revertReservationIfCompleted(
    tx: TxClient,
    reservationId: string,
  ): Promise<void> {
    const res = await tx.reservation.findUnique({
      where: { id: reservationId },
      select: { id: true, status: true },
    });
    if (!res || res.status !== 'COMPLETED') return;
    await tx.reservation.update({
      where: { id: res.id },
      data: { status: 'IN_PROGRESS', completedAt: null },
    });
  }

  async recalcInTx(tx: TxClient, bookId: string): Promise<void> {
    await this.incomeBookRepository.recalculateTotals(bookId, tx);
  }
}
