import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SetSettingDto } from './dto/set-setting.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('api/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSTEM_ADMIN', 'OWNER')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Public()
  findAll() {
    return this.settingsService.findAll();
  }

  @Get(':key')
  findByKey(@Param('key') key: string) {
    return this.settingsService.findByKey(key);
  }

  @Put(':key')
  set(@Param('key') key: string, @Body() dto: SetSettingDto, @CurrentUser() user: CurrentUserPayload) {
    return this.settingsService.set(key, dto, user.sub);
  }

  @Delete(':key')
  remove(@Param('key') key: string) {
    return this.settingsService.remove(key);
  }
}
