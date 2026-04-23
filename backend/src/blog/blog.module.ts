import { Module } from '@nestjs/common';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { BlogCommentsService } from './blog-comments.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [BlogController],
  providers: [BlogService, BlogCommentsService],
  exports: [BlogService, BlogCommentsService],
})
export class BlogModule {}
