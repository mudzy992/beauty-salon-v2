import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { SettingsModule } from '../settings/settings.module';
import { NotificationsRepository } from './notifications.repository';
import { CampaignQueueService } from './campaign-queue.service';

@Module({
  imports: [SettingsModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepository,
    CampaignQueueService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
