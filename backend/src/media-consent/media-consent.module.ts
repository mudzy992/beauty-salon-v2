import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import { MediaConsentController } from './media-consent.controller';
import { MediaConsentService } from './media-consent.service';

@Module({
  imports: [UploadsModule],
  controllers: [MediaConsentController],
  providers: [MediaConsentService],
  exports: [MediaConsentService],
})
export class MediaConsentModule {}
