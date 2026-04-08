import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { ExpensesService } from './expenses.service'
import { CreateExpenseDto } from './dto/create-expense.dto'
import { UpdateExpenseDto } from './dto/update-expense.dto'

@Controller('api/expenses')
@UseGuards(RolesGuard)
@Roles('SYSTEM_ADMIN', 'OWNER')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Post()
  create(@Body() dto: CreateExpenseDto, @CurrentUser() user: CurrentUserPayload) {
    return this.expenses.create(dto, user)
  }

  @Get()
  findAll(@Query('bookId') bookId: string) {
    return this.expenses.findAll(bookId)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.expenses.findOne(id)
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.expenses.update(id, dto, user)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.expenses.remove(id)
  }
}
