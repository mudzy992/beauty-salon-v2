import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RedeemLoyaltyPointsDto } from './dto/redeem-loyalty-points.dto';
import { AdjustLoyaltyPointsDto } from './dto/adjust-loyalty-points.dto';

@Controller('api/loyalty')
@UseGuards(RolesGuard)
@Roles('SYSTEM_ADMIN', 'OWNER')
export class LoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}

  @Get('settings')
  getSettings() {
    return this.loyalty.getSettings();
  }

  @Get('reconciliation')
  getReconciliationReport() {
    return this.loyalty.getReconciliationReport();
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
  redeem(@Param('id') id: string, @Body() dto: RedeemLoyaltyPointsDto) {
    return this.loyalty.redeemPoints(
      id,
      dto.points,
      dto.reason,
      dto.idempotencyKey,
    );
  }

  @Post('accounts/:id/adjust')
  adjust(@Param('id') id: string, @Body() dto: AdjustLoyaltyPointsDto) {
    return this.loyalty.adjustPoints(
      id,
      dto.pointsDelta,
      dto.note,
      dto.idempotencyKey,
    );
  }
}
