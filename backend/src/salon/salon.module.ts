import { Module } from '@nestjs/common';
import { SalonService } from './salon.service';
import { SalonController } from './salon.controller';
import { HolidayNotificationsService } from './holiday-notifications.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [SalonController],
  providers: [SalonService, HolidayNotificationsService],
  exports: [SalonService],
})
export class SalonModule {}
