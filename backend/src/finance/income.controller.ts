import { Controller, Get, Param, Post } from '@nestjs/common';
import { IncomeBooksService } from './income-books.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UseGuards } from '@nestjs/common';

@Controller('api/income-books')
@UseGuards(RolesGuard)
@Roles('SYSTEM_ADMIN', 'OWNER')
export class IncomeController {
  constructor(private readonly incomeBooks: IncomeBooksService) {}

  @Get()
  findAll() {
    return this.incomeBooks.findAll();
  }

  @Get('month/:year/:month')
  getOrCreate(@Param('year') year: string, @Param('month') month: string) {
    return this.incomeBooks.getOrCreateForMonth(
      parseInt(year, 10),
      parseInt(month, 10),
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.incomeBooks.findOne(id);
  }

  @Post('sync-from-daily-log/:dailyLogEntryId')
  syncFromDailyLog(@Param('dailyLogEntryId') dailyLogEntryId: string) {
    return this.incomeBooks.addEntryFromDailyLog(dailyLogEntryId);
  }
}
