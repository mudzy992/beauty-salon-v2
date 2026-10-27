import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DEFAULT_API_PAGE_LIMIT,
  MAX_API_PAGE_OFFSET,
} from '../common/pagination.constants';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlogCommentDto } from './dto/create-blog-comment.dto';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class BlogCommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  private parseList(value: string): string[] {
    return String(value ?? '')
      .split(/[\n,;]+/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private containsBadword(content: string, badwords: string[]): boolean {
    const text = content.toLowerCase();
    return badwords.some((w) => w && text.includes(w.toLowerCase()));
  }

  async create(postId: string, dto: CreateBlogCommentDto, userId: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
    });
    if (!post) throw new NotFoundException('Članak nije pronađen.');
    if (!post.isPublished)
      throw new ForbiddenException(
        'Komentar se može dodati samo na objavljeni članak.',
      );

    const [autoApprove, badwordsRaw, blockedRaw] = await Promise.all([
      this.settings.getBoolean('comments_auto_approve'),
      this.settings.getString('comments_badwords'),
      this.settings.getString('comments_blocked_user_ids'),
    ]);
    const badwords = this.parseList(badwordsRaw);
    const blockedUserIds = new Set(this.parseList(blockedRaw));

    if (blockedUserIds.has(userId)) {
      throw new ForbiddenException(
        'Komentarisanje nije dozvoljeno za ovaj račun.',
      );
    }

    const flaggedByBadwords =
      badwords.length > 0 && this.containsBadword(dto.content, badwords);
    const isApproved = autoApprove && !flaggedByBadwords;

    return this.prisma.blogComment.create({
      data: {
        postId,
        userId,
        content: dto.content,
        isApproved,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findPublicForPost(
    postId: string,
    pagination?: { limit?: number; offset?: number },
  ) {
    const limit = pagination?.limit ?? DEFAULT_API_PAGE_LIMIT;
    const offset = pagination?.offset ?? 0;
    const where = {
      postId,
      isApproved: true,
      post: { isPublished: true },
    };
    const [items, total] = await Promise.all([
      this.prisma.blogComment.findMany({
        where,
        select: {
          id: true,
          content: true,
          createdAt: true,
          user: { select: { firstName: true, lastName: true } },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.blogComment.count({ where }),
    ]);
    const nextOffset = offset + items.length;
    return {
      items,
      total,
      limit,
      offset,
      hasMore:
        items.length > 0 &&
        nextOffset < total &&
        nextOffset <= MAX_API_PAGE_OFFSET,
      nextOffset,
    };
  }

  findAllForPost(postId: string) {
    return this.prisma.blogComment.findMany({
      where: { postId },
      select: {
        id: true,
        content: true,
        isApproved: true,
        createdAt: true,
        user: {
          select: { username: true, firstName: true, lastName: true },
        },
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

  async countPending(user: CurrentUserPayload) {
    this.requireAdminOrOwner(user);
    const pending = await this.prisma.blogComment.count({
      where: { isApproved: false },
    });
    return { pending };
  }

  private isAdminOrOwner(user: CurrentUserPayload) {
    return user.roles.includes('SYSTEM_ADMIN') || user.roles.includes('OWNER');
  }

  private requireAdminOrOwner(user: CurrentUserPayload) {
    if (!this.isAdminOrOwner(user))
      throw new ForbiddenException('Samo administrator ili vlasnik.');
  }
}
