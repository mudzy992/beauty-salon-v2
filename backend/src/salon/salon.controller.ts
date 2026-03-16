import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SalonService } from './salon.service';
import { HolidayNotificationsService } from './holiday-notifications.service';
import { CreateSalonSettingsDto } from './dto/create-salon-settings.dto';
import { UpdateSalonSettingsDto } from './dto/update-salon-settings.dto';
import { WorkingHoursDto } from './dto/working-hours.dto';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('api/salon')
export class SalonController {
  constructor(
    private readonly salonService: SalonService,
    private readonly holidayNotifications: HolidayNotificationsService,
  ) {}

  @Get()
  @Public()
  findFirst() {
    return this.salonService.findFirst();
  }

  @Get('list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  findAll() {
    return this.salonService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.salonService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  create(@Body() dto: CreateSalonSettingsDto) {
    return this.salonService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  update(@Param('id') id: string, @Body() dto: UpdateSalonSettingsDto) {
    return this.salonService.update(id, dto);
  }

  @Get(':id/working-hours')
  @UseGuards(JwtAuthGuard)
  getWorkingHours(@Param('id') id: string) {
    return this.salonService.getWorkingHours(id);
  }

  @Post(':id/working-hours')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  setWorkingHours(
    @Param('id') id: string,
    @Body() body: { workingHours: WorkingHoursDto[] },
  ) {
    return this.salonService.setWorkingHours(id, body.workingHours);
  }

  @Post(':id/working-hours/ensure')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  ensureWorkingHours(@Param('id') id: string) {
    return this.salonService.ensureWorkingHoursExist(id);
  }

  @Post(':id/holidays')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  addHoliday(@Param('id') id: string, @Body() dto: CreateHolidayDto) {
    return this.salonService.addHoliday(id, dto);
  }

  @Patch('holidays/:holidayId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  updateHoliday(
    @Param('holidayId') holidayId: string,
    @Body() dto: UpdateHolidayDto,
  ) {
    return this.salonService.updateHoliday(holidayId, dto);
  }

  @Delete('holidays/:holidayId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  removeHoliday(@Param('holidayId') holidayId: string) {
    return this.salonService.removeHoliday(holidayId);
  }

  @Post('holidays/:holidayId/send-notification')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  sendHolidayNotification(@Param('holidayId') holidayId: string) {
    return this.holidayNotifications.sendForHoliday(holidayId);
  }
}
