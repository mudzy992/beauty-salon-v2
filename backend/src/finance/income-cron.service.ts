import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { IncomeBooksService } from './income-books.service';
import { ExpenseBooksService } from './expense-books.service';
import { getCurrentPeriod } from '../common/utils/book-period';
import { DEFAULT_SALON_TIMEZONE } from '../common/utils/zoned-time';

@Injectable()
export class IncomeCronService {
  private readonly logger = new Logger(IncomeCronService.name);

  constructor(
    private readonly incomeBooks: IncomeBooksService,
    private readonly expenseBooks: ExpenseBooksService,
  ) {}

  /**
   * Dnevna KIF provjera u 00:05 po vremenu salona: nadoknađuje propušteni
   * rollover nakon prekida rada; DB stanje čini ponavljanje sigurnim.
   */
  @Cron('5 0 * * *', { timeZone: DEFAULT_SALON_TIMEZONE })
  async handleIncomeBookCatchUp() {
    await this.rollIncomeBooks();
  }

  /** KUF raspored ostaje mjesečni; samo je timezone eksplicitno salon-local. */
  @Cron('5 0 1 * *', { timeZone: DEFAULT_SALON_TIMEZONE })
  async handleExpenseBookRollover() {
    await this.openExpenseBook();
  }

  private async rollIncomeBooks(): Promise<void> {
    try {
      const result = await this.incomeBooks.openNewMonthAndClosePrevious();
      this.logger.log(
        `KIF rollover: osigurana ${result.opened}; zatvorene knjige ${result.closed.join(', ') || '-'}.`,
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
