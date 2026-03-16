import { Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { AvailabilityService } from './availability.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [NotificationsModule, LoyaltyModule],
  controllers: [ReservationsController],
  providers: [ReservationsService, AvailabilityService],
  exports: [ReservationsService, AvailabilityService],
})
export class ReservationsModule {}
