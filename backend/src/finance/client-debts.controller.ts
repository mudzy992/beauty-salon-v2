import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ClientDebtsService } from './client-debts.service';
import { SettleClientDebtDto } from './dto/settle-client-debt.dto';

@Controller('api/client-debts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSTEM_ADMIN', 'OWNER', 'STYLIST')
export class ClientDebtsController {
  constructor(private readonly debts: ClientDebtsService) {}

  @Get()
  listForClient(@Query('clientId') clientId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.debts.listForClient(clientId, user);
  }

  @Patch(':id/settle')
  settle(@Param('id') id: string, @Body() dto: SettleClientDebtDto, @CurrentUser() user: CurrentUserPayload) {
    return this.debts.settle(id, user, dto.note);
  }
}

