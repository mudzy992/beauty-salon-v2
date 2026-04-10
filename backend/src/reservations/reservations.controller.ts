import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { AvailabilityService } from './availability.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { AdminCreateReservationDto } from './dto/admin-create-reservation.dto';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { StylistRejectDto } from './dto/stylist-respond.dto';
import { QueryReservationsDto } from './dto/query-reservations.dto';
import { StylistNoShowDto } from './dto/stylist-no-show.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/reservations')
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(
    private readonly reservations: ReservationsService,
    private readonly availability: AvailabilityService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateReservationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reservations.create(dto, user.sub);
  }

  @Post('admin')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  createByAdmin(@Body() dto: AdminCreateReservationDto) {
    return this.reservations.createByAdmin(dto);
  }

  @Get()
  findAll(
    @Query() query: QueryReservationsDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reservations.findAll(
      {
        fromDate: query.fromDate,
        toDate: query.toDate,
        status: query.status,
        asClient: query.asClient,
        asStylist: query.asStylist,
        page: query.page,
        pageSize: query.pageSize,
      },
      user,
    );
  }

  @Get('availability/debug')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  debugAvailability(@Query('serviceId') serviceId: string) {
    return this.availability.debugAvailability(serviceId);
  }

  @Get('availability/dates')
  getAvailableDates(
    @Query('serviceId') serviceId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.availability.getAvailableDates(
      serviceId,
      new Date(fromDate),
      toDate ? new Date(toDate) : undefined,
    );
  }

  @Get('availability/slots')
  getAvailableSlots(
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,
  ) {
    return this.availability.getAvailableSlots(serviceId, date);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.reservations.findOne(id, user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  updateByAdmin(@Param('id') id: string, @Body() dto: UpdateReservationDto) {
    return this.reservations.updateByAdmin(id, dto);
  }

  @Post(':id/cancel')
  cancelByClient(
    @Param('id') id: string,
    @Body() dto: CancelReservationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reservations.cancelByClient(id, user.sub, dto);
  }

  @Post(':id/admin-cancel')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  cancelByAdmin(@Param('id') id: string, @Body() dto: CancelReservationDto) {
    return this.reservations.cancelByAdmin(id, dto);
  }

  @Post(':id/confirm-attendance')
  confirmAttendance(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reservations.confirmAttendance(id, user.sub);
  }

  @Post(':id/stylist/:stylistProfileId/lock')
  @UseGuards(RolesGuard)
  @Roles('STYLIST', 'SYSTEM_ADMIN', 'OWNER')
  stylistLock(
    @Param('id') id: string,
    @Param('stylistProfileId') stylistProfileId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reservations.stylistLock(id, stylistProfileId, user.sub);
  }

  @Post(':id/stylist/:stylistProfileId/accept')
  @UseGuards(RolesGuard)
  @Roles('STYLIST', 'SYSTEM_ADMIN', 'OWNER')
  stylistAccept(
    @Param('id') id: string,
    @Param('stylistProfileId') stylistProfileId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reservations.stylistAccept(id, stylistProfileId, user.sub);
  }

  @Post(':id/stylist/:stylistProfileId/reject')
  @UseGuards(RolesGuard)
  @Roles('STYLIST', 'SYSTEM_ADMIN', 'OWNER')
  stylistReject(
    @Param('id') id: string,
    @Param('stylistProfileId') stylistProfileId: string,
    @Body() dto: StylistRejectDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reservations.stylistReject(id, stylistProfileId, user.sub, dto);
  }

  @Post(':id/stylist-mark-complete')
  @UseGuards(RolesGuard)
  @Roles('STYLIST', 'SYSTEM_ADMIN', 'OWNER')
  stylistMarkComplete(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reservations.stylistMarkComplete(id, user.sub);
  }

  @Post(':id/stylist-start')
  @UseGuards(RolesGuard)
  @Roles('STYLIST', 'SYSTEM_ADMIN', 'OWNER')
  stylistStart(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reservations.stylistStart(id, user.sub);
  }

  @Post(':id/reschedule/propose')
  @UseGuards(RolesGuard)
  @Roles('STYLIST', 'SYSTEM_ADMIN', 'OWNER')
  proposeReschedule(
    @Param('id') id: string,
    @Body()
    body: {
      includeBreaks?: boolean;
      mode?: 'actual_overrun' | 'manual_minutes' | 'use_break_only';
      manualShiftMinutes?: number;
    },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reservations.proposeReschedule(id, user.sub, {
      includeBreaks: body?.includeBreaks === true,
      mode: body?.mode,
      manualShiftMinutes: body?.manualShiftMinutes,
    });
  }

  @Post(':id/reschedule/commit')
  @UseGuards(RolesGuard)
  @Roles('STYLIST', 'SYSTEM_ADMIN', 'OWNER')
  commitReschedule(
    @Param('id') id: string,
    @Body()
    body: {
      includeBreaks?: boolean;
      mode?: 'actual_overrun' | 'manual_minutes' | 'use_break_only';
      manualShiftMinutes?: number;
    },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reservations.commitReschedule(id, user.sub, {
      includeBreaks: body?.includeBreaks === true,
      mode: body?.mode,
      manualShiftMinutes: body?.manualShiftMinutes,
    });
  }

  @Post(':id/reorder/request')
  @UseGuards(RolesGuard)
  @Roles('STYLIST', 'SYSTEM_ADMIN', 'OWNER')
  requestReorder(
    @Param('id') id: string,
    @Body() body: { targetStartTime: string; targetEndTime: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reservations.requestReorder(id, user.sub, {
      targetStartTime: body?.targetStartTime,
      targetEndTime: body?.targetEndTime,
    });
  }

  @Post(':id/use-break')
  @UseGuards(RolesGuard)
  @Roles('STYLIST', 'SYSTEM_ADMIN', 'OWNER')
  setUseBreakAfterOverrun(
    @Param('id') id: string,
    @Body() body: { useBreak: boolean },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reservations.setUseBreakAfterOverrun(id, user.sub, body?.useBreak === true);
  }

  @Post(':id/reschedule/accept')
  acceptReschedule(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reservations.acceptReschedule(id, user.sub);
  }

  @Post(':id/reschedule/decline')
  declineReschedule(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reservations.declineReschedule(id, user.sub);
  }

  @Post(':id/stylist-cancel')
  @UseGuards(RolesGuard)
  @Roles('STYLIST', 'SYSTEM_ADMIN', 'OWNER')
  stylistCancel(
    @Param('id') id: string,
    @Body() dto: CancelReservationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reservations.stylistCancel(id, user.sub, dto);
  }

  @Post(':id/stylist-no-show')
  @UseGuards(RolesGuard)
  @Roles('STYLIST', 'SYSTEM_ADMIN', 'OWNER')
  stylistNoShow(
    @Param('id') id: string,
    @Body() dto: StylistNoShowDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reservations.stylistMarkNoShow(id, user.sub, dto);
  }
}
