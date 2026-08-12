import { Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller';
import { PublicReservationsController } from './public-reservations.controller';
import { ReservationsService } from './reservations.service';
import { ReservationSharedService } from './reservation-shared.service';
import { ReservationNotifyService } from './reservation-notify.service';
import { ReservationQueriesService } from './reservation-queries.service';
import { ReservationListService } from './reservation-list.service';
import { ReservationCreateService } from './reservation-create.service';
import { ReservationUpdateService } from './reservation-update.service';
import { ReservationClientActionsService } from './reservation-client-actions.service';
import { ReservationStylistLockService } from './reservation-stylist-lock.service';
import { ReservationStylistAcceptService } from './reservation-stylist-accept.service';
import { ReservationStylistRejectService } from './reservation-stylist-reject.service';
import { ReservationRuntimeService } from './reservation-runtime.service';
import { ReservationRuntimeCancelService } from './reservation-runtime-cancel.service';
import { ReservationRescheduleService } from './reservation-reschedule.service';
import { ReservationRescheduleCommitService } from './reservation-reschedule-commit.service';
import { ReservationRescheduleClientService } from './reservation-reschedule-client.service';
import { ReservationReorderService } from './reservation-reorder.service';
import { ReservationCronService } from './reservation-cron.service';
import { ReservationAttendanceCronService } from './reservation-attendance-cron.service';
import { ReservationReorderCronService } from './reservation-reorder-cron.service';
import { AvailabilityService } from './availability.service';
import { AvailabilityDatesService } from './availability-dates.service';
import { AvailabilitySlotsService } from './availability-slots.service';
import { AvailabilityDebugService } from './availability-debug.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { SettingsModule } from '../settings/settings.module';
import { ReservationDelayCron } from './reservation-delay.cron';
import { ReservationDateService } from './reservation-date.service';

@Module({
  imports: [NotificationsModule, LoyaltyModule, SettingsModule],
  controllers: [ReservationsController, PublicReservationsController],
  providers: [
    ReservationsService,
    ReservationSharedService,
    ReservationNotifyService,
    ReservationQueriesService,
    ReservationListService,
    ReservationCreateService,
    ReservationUpdateService,
    ReservationClientActionsService,
    ReservationStylistLockService,
    ReservationStylistAcceptService,
    ReservationStylistRejectService,
    ReservationRuntimeService,
    ReservationRuntimeCancelService,
    ReservationRescheduleService,
    ReservationRescheduleCommitService,
    ReservationRescheduleClientService,
    ReservationReorderService,
    ReservationCronService,
    ReservationAttendanceCronService,
    ReservationReorderCronService,
    AvailabilityService,
    AvailabilityDatesService,
    AvailabilitySlotsService,
    AvailabilityDebugService,
    ReservationDelayCron,
    ReservationDateService,
  ],
  exports: [ReservationsService, AvailabilityService],
})
export class ReservationsModule {}
