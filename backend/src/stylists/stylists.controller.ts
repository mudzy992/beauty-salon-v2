import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { StylistsService } from './stylists.service';
import { CreateStylistProfileDto } from './dto/create-stylist-profile.dto';
import { UpdateStylistProfileDto } from './dto/update-stylist-profile.dto';
import { StylistWorkingHoursDto } from './dto/stylist-working-hours.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('api/stylists')
export class StylistsController {
  constructor(private readonly stylistsService: StylistsService) {}

  @Get()
  @Public()
  findAll(@Query('activeOnly') activeOnly?: string) {
    return this.stylistsService.findAll(activeOnly === 'true');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  findMyProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.stylistsService.findByUserId(user.sub);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  findByUserId(@Param('userId') userId: string) {
    return this.stylistsService.findByUserId(userId);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string, @CurrentUser() user?: CurrentUserPayload) {
    return this.stylistsService.findOne(id, user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  create(@Body() dto: CreateStylistProfileDto, @CurrentUser() user: CurrentUserPayload) {
    return this.stylistsService.create(dto, user.roles);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStylistProfileDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.stylistsService.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.stylistsService.remove(id, user.roles);
  }

  @Get(':id/working-hours')
  @UseGuards(JwtAuthGuard)
  getWorkingHours(@Param('id') id: string) {
    return this.stylistsService.getWorkingHours(id);
  }

  @Post(':id/working-hours')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  setWorkingHours(
    @Param('id') id: string,
    @Body() body: { workingHours: StylistWorkingHoursDto[] },
  ) {
    return this.stylistsService.setWorkingHours(id, body.workingHours);
  }

  @Get(':id/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  getStylistAnalytics(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.stylistsService.getStylistAnalytics(id, user.roles, fromDate, toDate);
  }

  @Get(':id/services')
  @Public()
  getServices(@Param('id') id: string) {
    return this.stylistsService.getServices(id);
  }

  @Post(':id/services')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  setServices(@Param('id') id: string, @Body() body: { serviceIds: string[] }) {
    return this.stylistsService.setServices(id, body.serviceIds);
  }
}
