import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { ExpenseBooksService } from './expense-books.service'
import { UnlockExpenseBookDto } from './dto/unlock-expense-book.dto'

@Controller('api/expense-books')
@UseGuards(RolesGuard)
@Roles('SYSTEM_ADMIN', 'OWNER')
export class ExpenseBooksController {
  constructor(private readonly books: ExpenseBooksService) {}

  @Get()
  findAll() {
    return this.books.findAll()
  }

  @Get('month/:year/:month')
  getOrCreate(@Param('year') year: string, @Param('month') month: string) {
    return this.books.getOrCreateForMonth(parseInt(year, 10), parseInt(month, 10))
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.books.findOne(id)
  }

  @Post(':id/close')
  close(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.books.close(id, user.sub)
  }

  @Post(':id/unlock')
  unlock(
    @Param('id') id: string,
    @Body() dto: UnlockExpenseBookDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.books.unlockBook(id, dto.reason, user.sub)
  }

  @Post(':id/lock')
  lock(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.books.lockBook(id, user.sub)
  }
}
