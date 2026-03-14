import { Module } from '@nestjs/common';
import { StylistsService } from './stylists.service';
import { StylistsController } from './stylists.controller';

@Module({
  controllers: [StylistsController],
  providers: [StylistsService],
  exports: [StylistsService],
})
export class StylistsModule {}
