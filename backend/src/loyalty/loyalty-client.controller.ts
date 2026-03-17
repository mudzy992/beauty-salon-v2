import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Controller('api/loyalty/client')
@UseGuards(JwtAuthGuard)
export class LoyaltyClientController {
  constructor(private readonly loyalty: LoyaltyService) {}

  @Get('me')
  async getMyLoyalty(
    @CurrentUser() user: CurrentUserPayload,
    @Query('serviceId') serviceId?: string,
  ) {
    return this.loyalty.getClientLoyaltyInfo(user.sub, serviceId);
  }
}
