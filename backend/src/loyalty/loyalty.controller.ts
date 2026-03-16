import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('api/loyalty')
@UseGuards(RolesGuard)
@Roles('SYSTEM_ADMIN', 'OWNER')
export class LoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}

  @Get('settings')
  getSettings() {
    return this.loyalty.getSettings();
  }

  @Get('accounts')
  findAll() {
    return this.loyalty.findAll();
  }

  @Get('accounts/:id')
  findOne(@Param('id') id: string) {
    return this.loyalty.findOne(id);
  }

  @Patch('accounts/:id')
  updateActive(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.loyalty.updateActive(id, !!body.isActive);
  }

  @Post('accounts/:id/redeem')
  redeem(
    @Param('id') id: string,
    @Body() body: { points: number; reason?: string },
  ) {
    return this.loyalty.redeemPoints(id, Number(body.points), body.reason);
  }

  @Post('accounts/:id/adjust')
  adjust(
    @Param('id') id: string,
    @Body() body: { pointsDelta: number; note?: string },
  ) {
    return this.loyalty.adjustPoints(id, Number(body.pointsDelta), body.note);
  }
}
