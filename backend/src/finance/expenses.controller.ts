import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { ExpensesService } from './expenses.service'
import { CreateExpenseDto } from './dto/create-expense.dto'
import { UpdateExpenseDto } from './dto/update-expense.dto'
import { AddExpenseAttachmentDto } from './dto/add-expense-attachment.dto'

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

  @Post(':id/attachments')
  addAttachment(@Param('id') id: string, @Body() dto: AddExpenseAttachmentDto, @CurrentUser() user: CurrentUserPayload) {
    return this.expenses.addAttachment(id, dto, user)
  }

  @Delete(':id/attachments/:attachmentId')
  removeAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.expenses.removeAttachment(id, attachmentId, user)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.expenses.remove(id)
  }
}
