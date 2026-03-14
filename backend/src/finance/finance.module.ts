import { Module } from '@nestjs/common';
import { ExpenseTemplatesService } from './expense-templates.service';
import { ExpenseCategoriesService } from './expense-categories.service';
import { ExpenseBooksService } from './expense-books.service';
import { ExpensesService } from './expenses.service';
import { IncomeBooksService } from './income-books.service';
import { IncomeCronService } from './income-cron.service';
import {
  ExpenseTemplatesController,
  ExpenseCategoriesController,
  ExpenseBooksController,
  ExpensesController,
} from './expense.controller';
import { IncomeController } from './income.controller';

@Module({
  controllers: [
    ExpenseTemplatesController,
    ExpenseCategoriesController,
    ExpenseBooksController,
    ExpensesController,
    IncomeController,
  ],
  providers: [
    ExpenseTemplatesService,
    ExpenseCategoriesService,
    ExpenseBooksService,
    ExpensesService,
    IncomeBooksService,
    IncomeCronService,
  ],
  exports: [ExpenseBooksService, ExpensesService, IncomeBooksService],
})
export class FinanceModule {}
