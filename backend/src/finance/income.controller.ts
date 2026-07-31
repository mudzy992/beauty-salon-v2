import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IncomeBooksService } from './income-books.service';
import { IncomeManualEntriesService } from './income-manual-entries.service';
import { IncomeSyncService } from './income-sync.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UnlockIncomeBookDto } from './dto/unlock-income-book.dto';
import { CreateIncomeBookManualEntryDto } from './dto/create-income-book-manual-entry.dto';
import { UpdateIncomeBookManualEntryDto } from './dto/update-income-book-manual-entry.dto';

@Controller('api/income-books')
@UseGuards(RolesGuard)
@Roles('SYSTEM_ADMIN', 'OWNER')
export class IncomeController {
  constructor(
    private readonly incomeBooks: IncomeBooksService,
    private readonly manualEntries: IncomeManualEntriesService,
    private readonly incomeSync: IncomeSyncService,
  ) {}

  @Get()
  findAll() {
    return this.incomeBooks.findAll();
  }

  @Get('month/:year/:month')
  getOrCreate(
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ) {
    return this.incomeBooks.getOrCreateForMonth(year, month);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.incomeBooks.findOne(id);
  }

  @Get(':id/integrity')
  checkIntegrity(@Param('id') id: string) {
    return this.incomeSync.checkIntegrity(id);
  }

  @Post(':id/resync')
  resync(@Param('id') id: string) {
    return this.incomeSync.resyncBook(id);
  }

  @Post(':id/unlock')
  unlock(
    @Param('id') id: string,
    @Body() dto: UnlockIncomeBookDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.incomeBooks.unlockBook(id, dto.reason, user.sub);
  }

  @Post(':id/lock')
  lock(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.incomeBooks.lockBook(id, user.sub);
  }

  @Post(':id/manual-entries')
  createManualEntry(
    @Param('id') id: string,
    @Body() dto: CreateIncomeBookManualEntryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.manualEntries.create(id, dto, user.sub);
  }

  @Patch(':id/manual-entries/:entryId')
  updateManualEntry(
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @Body() dto: UpdateIncomeBookManualEntryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.manualEntries.update(id, entryId, dto, user.sub);
  }

  @Delete(':id/manual-entries/:entryId')
  deleteManualEntry(
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.manualEntries.remove(id, entryId, user.sub);
  }

  @Post('sync-from-daily-log/:dailyLogEntryId')
  syncFromDailyLog(@Param('dailyLogEntryId') dailyLogEntryId: string) {
    return this.incomeSync.addEntryFromDailyLog(dailyLogEntryId);
  }
}
