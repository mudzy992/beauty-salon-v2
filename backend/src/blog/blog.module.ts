import { Module } from '@nestjs/common';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { BlogCommentsService } from './blog-comments.service';

@Module({
  controllers: [BlogController],
  providers: [BlogService, BlogCommentsService],
  exports: [BlogService, BlogCommentsService],
})
export class BlogModule {}
