import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  AnalyticsService,
  AnalyticsDashboardParams,
} from './analytics.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  AnalyticsDashboardQueryDto,
  toAnalyticsDashboardParams,
} from './dto/analytics-dashboard-query.dto';
import { HttpRateLimit } from '../common/rate-limiting/http-rate-limit.decorator';
import {
  HTTP_RATE_LIMIT_ADMIN_USER,
  HTTP_RATE_LIMIT_WINDOW_SECONDS,
} from '../common/rate-limiting/http-rate-limit.constants';

@Controller('api/analytics')
@UseGuards(RolesGuard)
@Roles('SYSTEM_ADMIN', 'OWNER')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('dashboard')
  @HttpRateLimit({
    bucket: 'analytics:dashboard',
    limit: HTTP_RATE_LIMIT_ADMIN_USER,
    windowSeconds: HTTP_RATE_LIMIT_WINDOW_SECONDS,
    identity: 'user',
  })
  getDashboard(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: AnalyticsDashboardQueryDto,
  ) {
    const params: AnalyticsDashboardParams = toAnalyticsDashboardParams(query);
    return this.analytics.getDashboard(user.roles, params);
  }
}
