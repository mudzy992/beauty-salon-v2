import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('api/loyalty')
@UseGuards(RolesGuard)
@Roles('SYSTEM_ADMIN', 'OWNER')
export class LoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}

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
}
