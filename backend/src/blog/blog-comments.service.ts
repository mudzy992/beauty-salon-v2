import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlogCommentDto } from './dto/create-blog-comment.dto';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Injectable()
export class BlogCommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(postId: string, dto: CreateBlogCommentDto, userId: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
    });
    if (!post) throw new NotFoundException('Članak nije pronađen.');
    if (!post.isPublished)
      throw new ForbiddenException(
        'Komentar se može dodati samo na objavljeni članak.',
      );
    return this.prisma.blogComment.create({
      data: {
        postId,
        userId,
        content: dto.content,
        isApproved: false,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findAllForPost(postId: string, approvedOnly = false) {
    return this.prisma.blogComment.findMany({
      where: { postId, ...(approvedOnly ? { isApproved: true } : {}) },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approve(commentId: string, user: CurrentUserPayload) {
    this.requireAdminOrOwner(user);
    const c = await this.prisma.blogComment.findUnique({
      where: { id: commentId },
    });
    if (!c) throw new NotFoundException('Komentar nije pronađen.');
    return this.prisma.blogComment.update({
      where: { id: commentId },
      data: { isApproved: true },
      include: { user: true, post: true },
    });
  }

  async remove(commentId: string, user: CurrentUserPayload) {
    const c = await this.prisma.blogComment.findUnique({
      where: { id: commentId },
    });
    if (!c) throw new NotFoundException('Komentar nije pronađen.');
    if (c.userId !== user.sub && !this.isAdminOrOwner(user))
      throw new ForbiddenException('Nemate dozvolu.');
    await this.prisma.blogComment.delete({ where: { id: commentId } });
    return { deleted: true };
  }

  private isAdminOrOwner(user: CurrentUserPayload) {
    return user.roles.includes('SYSTEM_ADMIN') || user.roles.includes('OWNER');
  }

  private requireAdminOrOwner(user: CurrentUserPayload) {
    if (!this.isAdminOrOwner(user))
      throw new ForbiddenException('Samo administrator ili vlasnik.');
  }
}
