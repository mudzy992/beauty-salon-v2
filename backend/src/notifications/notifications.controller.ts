import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { SetPreferenceDto } from './dto/set-preference.dto';

@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  findMine(
    @CurrentUser() user: CurrentUserPayload,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notifications.findForUser(
      user.sub,
      unreadOnly === 'true',
    );
  }

  @Patch(':id/read')
  markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
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
}
