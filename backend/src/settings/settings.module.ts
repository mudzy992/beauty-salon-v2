import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { SettingsEncryptionService } from './settings-encryption.service';
import { SettingsRepository } from './settings.repository';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, SettingsEncryptionService, SettingsRepository],
  exports: [SettingsService],
})
export class SettingsModule {}
