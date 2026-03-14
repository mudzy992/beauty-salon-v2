import { Module } from '@nestjs/common';
import { DailyLogController } from './daily-log.controller';
import { DailyLogService } from './daily-log.service';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [FinanceModule],
  controllers: [DailyLogController],
  providers: [DailyLogService],
  exports: [DailyLogService],
})
export class DailyLogModule {}
