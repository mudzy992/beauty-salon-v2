import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BlogService } from './blog.service';
import { BlogCommentsService } from './blog-comments.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { CreateBlogCommentDto } from './dto/create-blog-comment.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('api/blog')
export class BlogController {
  constructor(
    private readonly blog: BlogService,
    private readonly comments: BlogCommentsService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  create(
    @Body() dto: CreateBlogPostDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.blog.create(dto, user.sub);
  }

  @Get()
  @Public()
  findAll() {
    return this.blog.findAllPublic();
  }

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  findAllForAdmin() {
    return this.blog.findAllForAdmin();
  }

  @Get('slug/:slug')
  @Public()
  findBySlug(@Param('slug') slug: string) {
    return this.blog.findBySlug(slug);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  findOne(@Param('id') id: string) {
    return this.blog.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBlogPostDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.blog.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.blog.remove(id, user);
  }

  @Get(':postId/comments/admin')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  getCommentsForAdmin(@Param('postId') postId: string) {
    return this.comments.findAllForPost(postId);
  }

  @Get(':postId/comments')
  @Public()
  getComments(@Param('postId') postId: string) {
    return this.comments.findPublicForPost(postId);
  }

  @Post(':postId/comments')
  addComment(
    @Param('postId') postId: string,
    @Body() dto: CreateBlogCommentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.comments.create(postId, dto, user.sub);
  }

  @Get('comments/pending-count')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  pendingCount(@CurrentUser() user: CurrentUserPayload) {
    return this.comments.countPending(user);
  }

  @Patch('comments/:commentId/approve')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  approveComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.comments.approve(commentId, user);
  }

  @Delete('comments/:commentId')
  removeComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.comments.remove(commentId, user);
  }
}
