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
import { PublicStylistListQueryDto } from './dto/public-stylist-list-query.dto';
import { PagePaginationQueryDto } from '../common/dto/page-pagination-query.dto';
import { AnalyticsDateRangeQueryDto } from '../analytics/dto/analytics-date-range-query.dto';
import { HttpRateLimit } from '../common/rate-limiting/http-rate-limit.decorator';
import {
  HTTP_RATE_LIMIT_ADMIN_USER,
  HTTP_RATE_LIMIT_PUBLIC_IP,
  HTTP_RATE_LIMIT_WINDOW_SECONDS,
} from '../common/rate-limiting/http-rate-limit.constants';

@Controller('api/stylists')
export class StylistsController {
  constructor(private readonly stylistsService: StylistsService) {}

  @Get()
  @Public()
  @HttpRateLimit({
    bucket: 'catalog:stylists',
    limit: HTTP_RATE_LIMIT_PUBLIC_IP,
    windowSeconds: HTTP_RATE_LIMIT_WINDOW_SECONDS,
    identity: 'ip',
  })
  findAll(@Query() query: PublicStylistListQueryDto) {
    return this.stylistsService.findAllPublic({
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  findAllAdmin(@Query() query: PagePaginationQueryDto) {
    return this.stylistsService.findAll(false, {
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  findOneAdmin(@Param('id') id: string) {
    return this.stylistsService.findOne(id);
  }

  @Get('admin/:id/services')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  getAdminServices(
    @Param('id') id: string,
    @Query() query: PagePaginationQueryDto,
  ) {
    return this.stylistsService.getServices(id, {
      page: query.page,
      pageSize: query.pageSize,
    });
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
  @HttpRateLimit({
    bucket: 'catalog:stylist-detail',
    limit: HTTP_RATE_LIMIT_PUBLIC_IP,
    windowSeconds: HTTP_RATE_LIMIT_WINDOW_SECONDS,
    identity: 'ip',
  })
  findOne(@Param('id') id: string) {
    return this.stylistsService.findPublicOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  create(
    @Body() dto: CreateStylistProfileDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
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
  @HttpRateLimit({
    bucket: 'analytics:stylist',
    limit: HTTP_RATE_LIMIT_ADMIN_USER,
    windowSeconds: HTTP_RATE_LIMIT_WINDOW_SECONDS,
    identity: 'user',
  })
  getStylistAnalytics(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: AnalyticsDateRangeQueryDto,
  ) {
    return this.stylistsService.getStylistAnalytics(
      id,
      user.roles,
      query.fromDate,
      query.toDate,
    );
  }

  @Get(':id/services')
  @Public()
  @HttpRateLimit({
    bucket: 'catalog:stylist-services',
    limit: HTTP_RATE_LIMIT_PUBLIC_IP,
    windowSeconds: HTTP_RATE_LIMIT_WINDOW_SECONDS,
    identity: 'ip',
  })
  getServices(
    @Param('id') id: string,
    @Query() query: PagePaginationQueryDto,
  ) {
    return this.stylistsService.getServices(
      id,
      {
        page: query.page,
        pageSize: query.pageSize,
      },
      true,
    );
  }

  @Post(':id/services')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  setServices(@Param('id') id: string, @Body() body: { serviceIds: string[] }) {
    return this.stylistsService.setServices(id, body.serviceIds);
  }
}
