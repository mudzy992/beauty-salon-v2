import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { IncomeBooksService } from './income-books.service';

@Injectable()
export class IncomeCronService {
  constructor(private readonly incomeBooks: IncomeBooksService) {}

  /** Svakog 1. u mjesecu u 00:05 otvori novu knjigu prihoda i zatvori prethodnu. */
  @Cron('5 0 1 * *')
  async handleOpenAndCloseIncomeBooks() {
    await this.incomeBooks.openNewMonthAndClosePrevious();
  }
}
