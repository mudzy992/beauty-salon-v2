import { Module } from '@nestjs/common';
import { DailyLogController } from './daily-log.controller';
import { DailyLogService } from './daily-log.service';
import { DailyLogPublicService } from './daily-log-public.service';
import { DailyLogReversalService } from './daily-log-reversal.service';
import { DailyLogAdminService } from './daily-log-admin.service';
import { DailyLogValidators } from './daily-log.validators';
import { FinanceModule } from '../finance/finance.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [FinanceModule, LoyaltyModule, NotificationsModule],
  controllers: [DailyLogController],
  providers: [
    DailyLogService,
    DailyLogPublicService,
    DailyLogReversalService,
    DailyLogAdminService,
    DailyLogValidators,
  ],
  exports: [DailyLogService],
})
export class DailyLogModule {}
