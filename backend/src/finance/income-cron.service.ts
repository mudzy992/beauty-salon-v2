import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { IncomeBooksService } from './income-books.service';
import { ExpenseBooksService } from './expense-books.service';
import { getCurrentPeriod } from '../common/utils/book-period';

@Injectable()
export class IncomeCronService {
  private readonly logger = new Logger(IncomeCronService.name);

  constructor(
    private readonly incomeBooks: IncomeBooksService,
    private readonly expenseBooks: ExpenseBooksService,
  ) {}

  /** Svakog 1. u mjesecu u 00:05 otvori nove knjige i zatvori prethodnu knjigu prihoda. */
  @Cron('5 0 1 * *')
  async handleMonthlyBookRollover() {
    await this.rollIncomeBooks();
    await this.openExpenseBook();
  }

  private async rollIncomeBooks(): Promise<void> {
    try {
      const result = await this.incomeBooks.openNewMonthAndClosePrevious();
      this.logger.log(
        `KIF rollover: otvorena ${result.opened}, zatvorena ${result.closed ?? '-'}.`,
      );
    } catch (err) {
      this.logger.error(
        `KIF rollover nije uspio: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async openExpenseBook(): Promise<void> {
    const { year, month } = getCurrentPeriod();
    try {
      const book = await this.expenseBooks.getOrCreateForMonth(year, month);
      this.logger.log(`KUF rollover: otvorena knjiga ${book.id}.`);
    } catch (err) {
      this.logger.error(
        `KUF rollover nije uspio: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
