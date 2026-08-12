import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { SetPreferenceDto } from './dto/set-preference.dto';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { UnregisterPushTokenDto } from './dto/unregister-push-token.dto';
import { SendTestEmailDto } from './dto/send-test-email.dto';
import { TestSmtpConnectionDto } from './dto/test-smtp-connection.dto';
import { CampaignAudienceDto } from './dto/campaign-audience.dto';
import { SendCampaignDto } from './dto/send-campaign.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('push-token')
  registerPushToken(
    @Body() dto: RegisterPushTokenDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.notifications.registerPushToken(
      user.sub,
      dto.token,
      dto.platform,
    );
  }

  @Delete('push-token')
  unregisterPushToken(
    @Body() dto: UnregisterPushTokenDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.notifications.unregisterPushToken(user.sub, dto.token);
  }

  @Get()
  findMine(
    @CurrentUser() user: CurrentUserPayload,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notifications.findForUser(user.sub, unreadOnly === 'true');
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.notifications.markAsRead(id, user.sub);
  }

  @Get('preferences')
  getPreferences(@CurrentUser() user: CurrentUserPayload) {
    return this.notifications.getPreferences(user.sub);
  }

  @Post('preferences')
  setPreference(
    @Body() dto: SetPreferenceDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.notifications.setPreference(
      user.sub,
      dto.type,
      dto.pushEnabled,
      dto.emailEnabled,
    );
  }

  @Post('test-email')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  sendTestEmail(
    @Body() dto: SendTestEmailDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const requestedBy = dto.requestedByName || user.username || user.email;
    if (dto.to?.trim()) {
      return this.notifications.sendTestEmail({
        to: dto.to.trim(),
        requestedByUsername: requestedBy,
      });
    }
    return this.notifications.sendTestEmailToUser({
      userId: user.sub,
      requestedByUsername: requestedBy,
    });
  }

  @Post('test-smtp-connection')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  testSmtpConnection(@Body() _dto: TestSmtpConnectionDto) {
    return this.notifications.testSmtpConnection();
  }

  @Post('campaigns/audience')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  getCampaignAudience(@Body() dto: CampaignAudienceDto) {
    return this.notifications.getCampaignAudienceSummary(dto);
  }

  @Post('campaigns/send')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  sendCampaign(
    @Body() dto: SendCampaignDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.notifications.sendCampaign(dto, user.sub);
  }
}
