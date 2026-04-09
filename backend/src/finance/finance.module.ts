import { Module } from '@nestjs/common';
import { ExpenseTemplatesService } from './expense-templates.service';
import { ExpenseCategoriesService } from './expense-categories.service';
import { ExpenseBooksService } from './expense-books.service';
import { ExpensesService } from './expenses.service';
import { IncomeBooksService } from './income-books.service';
import { IncomeCronService } from './income-cron.service';
import { ExpenseTemplatesController } from './expense-templates.controller';
import { ExpenseCategoriesController } from './expense-categories.controller';
import { ExpenseBooksController } from './expense-books.controller';
import { ExpensesController } from './expenses.controller';
import { IncomeController } from './income.controller';
import { ClientDebtsController } from './client-debts.controller';
import { ClientDebtsService } from './client-debts.service';

@Module({
  controllers: [
    ExpenseTemplatesController,
    ExpenseCategoriesController,
    ExpenseBooksController,
    ExpensesController,
    IncomeController,
    ClientDebtsController,
  ],
  providers: [
    ExpenseTemplatesService,
    ExpenseCategoriesService,
    ExpenseBooksService,
    ExpensesService,
    IncomeBooksService,
    IncomeCronService,
    ClientDebtsService,
  ],
  exports: [ExpenseBooksService, ExpensesService, IncomeBooksService],
})
export class FinanceModule {}
