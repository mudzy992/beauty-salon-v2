import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AppReleasesController } from './app-releases.controller';
import { AppReleasesPublicController } from './app-releases-public.controller';
import { AppReleasesService } from './app-releases.service';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  ],
  controllers: [AppReleasesController, AppReleasesPublicController],
  providers: [AppReleasesService],
  exports: [AppReleasesService],
})
export class AppReleasesModule {}
