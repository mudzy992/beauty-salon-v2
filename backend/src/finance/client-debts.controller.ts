import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ClientDebtsService } from './client-debts.service';
import { SettleClientDebtDto } from './dto/settle-client-debt.dto';
import { RepayClientDebtDto } from './dto/repay-client-debt.dto';

@Controller('api/client-debts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSTEM_ADMIN', 'OWNER', 'STYLIST')
export class ClientDebtsController {
  constructor(private readonly debts: ClientDebtsService) {}

  @Get()
  listForClient(@Query('clientId') clientId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.debts.listForClient(clientId, user);
  }

  @Get('stylist/me')
  listForMe(@CurrentUser() user: CurrentUserPayload) {
    return this.debts.listForStylistMe(user);
  }

  @Get('all')
  @Roles('SYSTEM_ADMIN', 'OWNER')
  listAll(
    @Query('status') status: string,
    @Query('stylistProfileId') stylistProfileId: string,
    @Query('clientId') clientId: string,
  ) {
    return this.debts.listAll({
      status,
      stylistProfileId,
      clientId,
    });
  }

  @Patch(':id/settle')
  settle(@Param('id') id: string, @Body() dto: SettleClientDebtDto, @CurrentUser() user: CurrentUserPayload) {
    return this.debts.settle(id, user, dto.note);
  }

  @Post(':id/repay')
  repay(@Param('id') id: string, @Body() dto: RepayClientDebtDto, @CurrentUser() user: CurrentUserPayload) {
    return this.debts.repayDebt(id, dto, user);
  }
}

