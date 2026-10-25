import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IncomeSyncService } from '../finance/income-sync.service';
import { IncomeBookRepository } from '../finance/repositories/income-book.repository';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { assertReservationTransition } from '../reservations/assert-reservation-transition';
import { RESERVATION_STATUS } from '../reservations/constants';
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

  async assertOpenBooksForEntry(
    entry: { date: Date; id: string },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;
    const debtPayments = await db.dailyLogEntry.findMany({
      where: { sourceEntryId: entry.id, deletedAt: null },
      select: { id: true, date: true },
    });

    const relatedEntryIds = [entry.id, ...debtPayments.map(({ id }) => id)];
    const [autoEntries, manualEntries] = await Promise.all([
      db.incomeBookEntry.findMany({
        where: { dailyLogEntryId: { in: relatedEntryIds } },
        select: { bookId: true },
      }),
      db.incomeBookManualEntry.findMany({
        where: { dailyLogEntryId: { in: relatedEntryIds } },
        select: { bookId: true },
      }),
    ]);
    const bookIds = [
      ...new Set([
        ...autoEntries.map(({ bookId }) => bookId),
        ...manualEntries.map(({ bookId }) => bookId),
      ]),
    ].sort();
    await this.incomeSync.assertBooksOpenForDatesAndIds(
      [
        new Date(entry.date),
        ...debtPayments.map(({ date }) => new Date(date)),
      ],
      bookIds,
      tx,
    );
  }

  /** Full side-effect undo for COMPLETED entry (KIF, loyalty, debts, reservation). */
  async reverseCompletedEffects(
    entryId: string,
    opts?: { revertReservation?: boolean },
    transaction?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = transaction ?? this.prisma;
    const entry = await db.dailyLogEntry.findUnique({
      where: { id: entryId },
    });
    if (!entry || entry.status !== 'COMPLETED') return;
    await this.assertOpenBooksForEntry(entry);

    const reverse = async (tx: Prisma.TransactionClient) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM "daily_log_entries" WHERE id = ${entryId} FOR UPDATE`,
      );
      const currentEntry = await tx.dailyLogEntry.findUnique({
        where: { id: entryId },
        select: { id: true, status: true, reservationId: true, date: true },
      });
      if (!currentEntry || currentEntry.status !== 'COMPLETED') return;

      await this.assertOpenBooksForEntry(currentEntry, tx);
      await this.removeIncomeBookEntries(tx, entryId);
      await this.reverseLinkedDebtPayments(tx, entryId);
      await this.removeCreatedDebts(tx, entryId);
      if (opts?.revertReservation !== false && currentEntry.reservationId) {
        await this.revertReservationIfCompleted(tx, currentEntry.reservationId);
      }
      await this.loyalty.reverseFromDailyLog(entryId, tx);
    };

    if (transaction) return reverse(transaction);
    await this.prisma.$transaction(reverse);
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
    if (
      entry.status !== 'COMPLETED' ||
      entry.deletedAt ||
      entry.kind === 'DEBT_PAYMENT'
    ) {
      return;
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM "daily_log_entries" WHERE id = ${entry.id} FOR UPDATE`,
      );
      const currentEntry = await tx.dailyLogEntry.findUnique({
        where: { id: entry.id },
      });
      if (
        !currentEntry ||
        currentEntry.status !== 'COMPLETED' ||
        currentEntry.deletedAt ||
        currentEntry.kind === 'DEBT_PAYMENT'
      ) {
        return;
      }

      const existing = await tx.incomeBookEntry.findFirst({
        where: { dailyLogEntryId: currentEntry.id },
      });
      if (!existing) {
        await this.incomeSync.addEntryFromDailyLog(currentEntry.id, tx);
        return;
      }

      const book = await this.incomeSync.assertBooksOpenForDateAndIds(
        new Date(currentEntry.date),
        [existing.bookId],
        tx,
      );
      const data = {
        amount: getServiceAmount(
          currentEntry.actualPrice,
          currentEntry.tipAmount,
        ),
        tipAmount: currentEntry.tipAmount,
        date: currentEntry.date,
      };
      if (existing.bookId !== book.id) {
        await this.incomeSync.assertBookOpenById(existing.bookId, tx);
        await tx.incomeBookEntry.delete({ where: { id: existing.id } });
        await this.recalcInTx(tx, existing.bookId);
        await tx.incomeBookEntry.create({
          data: { bookId: book.id, dailyLogEntryId: currentEntry.id, ...data },
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
    const bookIds = [...new Set(entries.map((e) => e.bookId))].sort();
    for (const bookId of bookIds) {
      await this.incomeSync.assertBookOpenById(bookId, tx);
    }
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
    if (debtPayments.length === 0) return;

    const debtPaymentIds = debtPayments.map(({ id }) => id);
    const manuals = await tx.incomeBookManualEntry.findMany({
      where: { dailyLogEntryId: { in: debtPaymentIds } },
      select: { bookId: true },
    });
    const bookIds = [...new Set(manuals.map(({ bookId }) => bookId))].sort();
    for (const bookId of bookIds) {
      await this.incomeSync.assertBookOpenById(bookId, tx);
    }
    await tx.incomeBookManualEntry.deleteMany({
      where: { dailyLogEntryId: { in: debtPaymentIds } },
    });
    for (const bookId of bookIds) {
      await this.recalcInTx(tx, bookId);
    }

    for (const dp of debtPayments) {
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
    assertReservationTransition(res.status, RESERVATION_STATUS.IN_PROGRESS);
    await tx.reservation.update({
      where: { id: res.id },
      data: { status: RESERVATION_STATUS.IN_PROGRESS, completedAt: null },
    });
  }

  async recalcInTx(tx: TxClient, bookId: string): Promise<void> {
    await this.incomeBookRepository.recalculateTotals(bookId, tx);
  }
}
