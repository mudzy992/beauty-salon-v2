import { Module } from '@nestjs/common';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { LoyaltyClientController } from './loyalty-client.controller';

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [LoyaltyController, LoyaltyClientController],
  providers: [LoyaltyService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
