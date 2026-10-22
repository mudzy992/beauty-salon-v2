import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DailyLogService } from './daily-log.service';
import { DailyLogPublicService } from './daily-log-public.service';
import { DailyLogAdminService } from './daily-log-admin.service';
import { CreateDailyLogEntryDto } from './dto/create-daily-log-entry.dto';
import { UpdateDailyLogEntryDto } from './dto/update-daily-log-entry.dto';
import { AddDailyLogImageDto } from './dto/add-daily-log-image.dto';
import { CreateFromReservationDto } from './dto/create-from-reservation.dto';
import { DailyLogDispositionService } from './daily-log-disposition.service';
import { DeleteDailyLogEntryDto } from './dto/delete-daily-log-entry.dto';
import { DailyLogDispositionDto } from './dto/daily-log-disposition.dto';
import { RestoreDailyLogEntryDto } from './dto/restore-daily-log-entry.dto';
import { BeforeAfterQueryDto } from './dto/before-after-query.dto';
import { DailyLogRestoreService } from './daily-log-restore.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('api/daily-log')
export class DailyLogController {
  constructor(
    private readonly dailyLog: DailyLogService,
    private readonly dailyLogPublic: DailyLogPublicService,
    private readonly dailyLogAdmin: DailyLogAdminService,
    private readonly dailyLogDisposition: DailyLogDispositionService,
    private readonly dailyLogRestore: DailyLogRestoreService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateDailyLogEntryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.dailyLog.create(dto, user);
  }

  @Post('from-reservation/:reservationId')
  createFromReservation(
    @Param('reservationId') reservationId: string,
    @Body() body: CreateFromReservationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.dailyLog.createFromReservation(
      reservationId,
      body,
      body.tipAmount ?? 0,
      body.notes,
      user,
    );
  }

  @Get()
  findAll(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('stylistProfileId') stylistProfileId: string,
    @Query('includeDeleted') includeDeleted: string | undefined,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.dailyLog.findAll(
      {
        fromDate,
        toDate,
        stylistProfileId,
        includeDeleted: includeDeleted === '1' || includeDeleted === 'true',
      },
      user,
    );
  }

  @Get('before-after')
  @Public()
  getBeforeAfterPairs(@Query() query: BeforeAfterQueryDto) {
    return this.dailyLogPublic.findBeforeAfterPairs({
      limit: query.limit,
      offset: query.offset,
      serviceId: query.serviceId,
      random: query.random === '1' || query.random === 'true',
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.dailyLog.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDailyLogEntryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.dailyLogAdmin.update(id, dto, user);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.dailyLog.complete(id, user);
  }

  @Post(':id/revert')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  revert(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.dailyLogAdmin.revertToPending(id, user);
  }

  @Post(':id/dispose')
  dispose(
    @Param('id') id: string,
    @Body() dto: DailyLogDispositionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.dailyLogDisposition.dispose(id, dto, user);
  }

  @Delete(':id')
  softDelete(
    @Param('id') id: string,
    @Body() dto: DeleteDailyLogEntryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.dailyLogAdmin.softDelete(id, dto, user);
  }

  @Post(':id/restore')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  restore(
    @Param('id') id: string,
    @Body() dto: RestoreDailyLogEntryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.dailyLogRestore.restore(id, dto, user);
  }

  @Post(':id/images')
  addImage(
    @Param('id') id: string,
    @Body() dto: AddDailyLogImageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.dailyLogAdmin.addImage(id, dto, user);
  }

  @Delete(':id/images/:imageId')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  removeImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.dailyLogAdmin.removeImage(id, imageId, user);
  }
}
