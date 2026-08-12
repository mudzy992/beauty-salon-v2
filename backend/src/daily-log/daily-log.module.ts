import { Module, forwardRef } from '@nestjs/common';
import { DailyLogController } from './daily-log.controller';
import { DailyLogService } from './daily-log.service';
import { DailyLogPublicService } from './daily-log-public.service';
import { DailyLogReversalService } from './daily-log-reversal.service';
import { DailyLogAdminService } from './daily-log-admin.service';
import { DailyLogValidators } from './daily-log.validators';
import { DailyLogSeedFromDirectService } from './daily-log-seed-from-direct.service';
import { DailyLogDispositionService } from './daily-log-disposition.service';
import { FinanceModule } from '../finance/finance.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReservationsModule } from '../reservations/reservations.module';

@Module({
  imports: [
    FinanceModule,
    LoyaltyModule,
    NotificationsModule,
    forwardRef(() => ReservationsModule),
  ],
  controllers: [DailyLogController],
  providers: [
    DailyLogService,
    DailyLogPublicService,
    DailyLogReversalService,
    DailyLogAdminService,
    DailyLogValidators,
    DailyLogSeedFromDirectService,
    DailyLogDispositionService,
  ],
  exports: [DailyLogService, DailyLogSeedFromDirectService, DailyLogDispositionService],
})
export class DailyLogModule {}
