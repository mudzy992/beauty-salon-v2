import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { SettingsEncryptionService } from './settings-encryption.service';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, SettingsEncryptionService],
  exports: [SettingsService],
})
export class SettingsModule {}
