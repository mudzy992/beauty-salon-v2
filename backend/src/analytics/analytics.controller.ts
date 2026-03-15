import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService, AnalyticsDashboardParams } from './analytics.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('api/analytics')
@UseGuards(RolesGuard)
@Roles('SYSTEM_ADMIN', 'OWNER')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('dashboard')
  getDashboard(
    @CurrentUser() user: CurrentUserPayload,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('monthsBack') monthsBack?: string,
  ) {
    const params: AnalyticsDashboardParams = {};
    if (fromDate && toDate) {
      params.fromDate = fromDate;
      params.toDate = toDate;
    } else if (year != null && month != null) {
      params.year = parseInt(year, 10);
      params.month = parseInt(month, 10);
    } else if (monthsBack != null) {
      params.monthsBack = parseInt(monthsBack, 10);
    }
    return this.analytics.getDashboard(user.roles, params);
  }
}
