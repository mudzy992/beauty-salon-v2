import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ExpenseTemplatesService } from './expense-templates.service';
import { ExpenseCategoriesService } from './expense-categories.service';
import { ExpenseBooksService } from './expense-books.service';
import { ExpensesService } from './expenses.service';
import { CreateExpenseTemplateDto } from './dto/create-expense-template.dto';
import { UpdateExpenseTemplateDto } from './dto/update-expense-template.dto';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UseGuards } from '@nestjs/common';

@Controller('api/expense-templates')
@UseGuards(RolesGuard)
@Roles('SYSTEM_ADMIN', 'OWNER')
export class ExpenseTemplatesController {
  constructor(private readonly templates: ExpenseTemplatesService) {}

  @Post()
  create(@Body() dto: CreateExpenseTemplateDto) {
    return this.templates.create(dto);
  }

  @Get()
  findAll() {
    return this.templates.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templates.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExpenseTemplateDto) {
    return this.templates.update(id, dto);
  }

  @Post(':id/fields')
  addField(
    @Param('id') id: string,
    @Body()
    body: {
      fieldName: string;
      fieldType: string;
      isRequired?: boolean;
      sortOrder?: number;
      defaultValue?: string;
    },
  ) {
    return this.templates.addField(
      id,
      body.fieldName,
      body.fieldType,
      body.isRequired,
      body.sortOrder,
      body.defaultValue,
    );
  }

  @Delete('fields/:fieldId')
  removeField(@Param('fieldId') fieldId: string) {
    return this.templates.removeField(fieldId);
  }
}

@Controller('api/expense-categories')
@UseGuards(RolesGuard)
@Roles('SYSTEM_ADMIN', 'OWNER')
export class ExpenseCategoriesController {
  constructor(private readonly categories: ExpenseCategoriesService) {}

  @Post()
  create(@Body() dto: CreateExpenseCategoryDto) {
    return this.categories.create(dto);
  }

  @Get()
  findAll(@Query('activeOnly') activeOnly: string) {
    return this.categories.findAll(activeOnly === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categories.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExpenseCategoryDto) {
    return this.categories.update(id, dto);
  }
}

@Controller('api/expense-books')
@UseGuards(RolesGuard)
@Roles('SYSTEM_ADMIN', 'OWNER')
export class ExpenseBooksController {
  constructor(private readonly books: ExpenseBooksService) {}

  @Get()
  findAll() {
    return this.books.findAll();
  }

  @Get('month/:year/:month')
  getOrCreate(@Param('year') year: string, @Param('month') month: string) {
    return this.books.getOrCreateForMonth(
      parseInt(year, 10),
      parseInt(month, 10),
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.books.findOne(id);
  }

  @Post(':id/close')
  close(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.books.close(id, user.sub);
  }
}

@Controller('api/expenses')
@UseGuards(RolesGuard)
@Roles('SYSTEM_ADMIN', 'OWNER')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Post()
  create(
    @Body() dto: CreateExpenseDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.expenses.create(dto, user);
  }

  @Get()
  findAll(@Query('bookId') bookId: string) {
    return this.expenses.findAll(bookId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.expenses.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.expenses.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.expenses.remove(id);
  }
}
