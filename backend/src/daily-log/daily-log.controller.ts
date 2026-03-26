import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { DailyLogService } from './daily-log.service';
import { CreateDailyLogEntryDto } from './dto/create-daily-log-entry.dto';
import { UpdateDailyLogEntryDto } from './dto/update-daily-log-entry.dto';
import { AddDailyLogImageDto } from './dto/add-daily-log-image.dto';
import { CreateFromReservationDto } from './dto/create-from-reservation.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('api/daily-log')
export class DailyLogController {
  constructor(private readonly dailyLog: DailyLogService) {}

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
      body.actualPrice,
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
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.dailyLog.findAll({ fromDate, toDate, stylistProfileId }, user);
  }

  @Get('before-after')
  @Public()
  getBeforeAfterPairs(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('serviceId') serviceId?: string,
  ) {
    return this.dailyLog.findBeforeAfterPairs({
      limit: limit != null ? parseInt(limit, 10) : undefined,
      offset: offset != null ? parseInt(offset, 10) : undefined,
      serviceId,
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
    return this.dailyLog.update(id, dto, user);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.dailyLog.complete(id, user);
  }

  @Post(':id/images')
  addImage(
    @Param('id') id: string,
    @Body() dto: AddDailyLogImageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.dailyLog.addImage(id, dto, user);
  }
}
