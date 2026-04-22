import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { LoyaltyService } from './loyalty.service';

@Controller('api/loyalty/stylist')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STYLIST', 'SYSTEM_ADMIN', 'OWNER')
export class LoyaltyStylistController {
  constructor(private readonly loyalty: LoyaltyService) {}

  @Get('client/:userId')
  getClientLoyalty(
    @Param('userId') userId: string,
    @Query('serviceId') serviceId?: string,
    @Query('serviceIds') serviceIds?: string,
  ) {
    const ids = (serviceIds ?? '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    return this.loyalty.getClientLoyaltyInfo(userId, serviceId, ids.length > 0 ? ids : undefined);
  }
}

