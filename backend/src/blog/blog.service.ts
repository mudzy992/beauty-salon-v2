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
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { optionalSeoFields, slugSource } from './utils/blog-post-data';
import { emptyToNull } from '../common/utils/empty-to-null';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { sanitizeBlogContent } from './utils/sanitize-blog-content';

const PUBLIC_BLOG_LIST_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  heroImage: true,
  isPublished: true,
  publishedAt: true,
  createdAt: true,
} as const;

const PUBLIC_BLOG_DETAIL_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  content: true,
  heroImage: true,
  ogImage: true,
  seoTitle: true,
  seoDescription: true,
  noIndex: true,
  isPublished: true,
  publishedAt: true,
  updatedAt: true,
  author: { select: { firstName: true, lastName: true } },
} as const;

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBlogPostDto, authorId: string) {
    const slug = await this.ensureUniqueSlug(slugSource(dto, dto.title));
    const isPublished = dto.isPublished ?? false;
    return this.prisma.blogPost.create({
      data: {
        authorId,
        title: dto.title,
        slug,
        content: sanitizeBlogContent(dto.content),
        ...optionalSeoFields(dto),
        noIndex: dto.noIndex ?? false,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findAllPublic(pagination?: { limit?: number; offset?: number }) {
    const limit = pagination?.limit ?? DEFAULT_API_PAGE_LIMIT;
    const offset = pagination?.offset ?? 0;
    const where = { isPublished: true };
    const [items, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        select: PUBLIC_BLOG_LIST_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.blogPost.count({ where }),
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

  async findAllForAdmin() {
    const posts = await this.prisma.blogPost.findMany({
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const pendingByPost = await this.prisma.blogComment.groupBy({
      by: ['postId'],
      where: { isApproved: false },
      _count: { _all: true },
    });
    const pendingMap = new Map(
      pendingByPost.map((x) => [x.postId, x._count._all]),
    );

    return posts.map((p) => {
      const total = p._count?.comments ?? 0;
      const pending = pendingMap.get(p.id) ?? 0;
      return {
        ...p,
        commentsTotalCount: total,
        commentsPendingCount: pending,
      };
    });
  }

  async findOne(id: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        comments: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!post) throw new NotFoundException('Članak nije pronađen.');
    return post;
  }

  async findBySlug(slug: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug, isPublished: true },
      select: PUBLIC_BLOG_DETAIL_SELECT,
    });
    if (!post) throw new NotFoundException('Članak nije pronađen.');
    return { ...post, content: sanitizeBlogContent(post.content) };
  }

  async update(id: string, dto: UpdateBlogPostDto, user: CurrentUserPayload) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Članak nije pronađen.');
    if (
      post.authorId !== user.sub &&
      !user.roles.includes('SYSTEM_ADMIN') &&
      !user.roles.includes('OWNER')
    ) {
      throw new ForbiddenException('Nemate dozvolu za izmjenu ovog članka.');
    }
    let slug = post.slug;
    if (dto.slug != null || dto.title != null) {
      slug = await this.ensureUniqueSlug(slugSource(dto, post.title), id);
    }
    const isPublished = dto.isPublished ?? post.isPublished;
    const publishedAt =
      isPublished && !post.publishedAt ? new Date() : post.publishedAt;
    return this.prisma.blogPost.update({
      where: { id },
      data: {
        ...(dto.title != null && { title: dto.title }),
        ...(dto.content !== undefined && {
          content: sanitizeBlogContent(dto.content),
        }),
        ...(dto.excerpt !== undefined && { excerpt: emptyToNull(dto.excerpt) }),
        ...(dto.heroImage !== undefined && {
          heroImage: emptyToNull(dto.heroImage),
        }),
        ...(dto.ogImage !== undefined && { ogImage: emptyToNull(dto.ogImage) }),
        ...(dto.seoTitle !== undefined && {
          seoTitle: emptyToNull(dto.seoTitle),
        }),
        ...(dto.seoDescription !== undefined && {
          seoDescription: emptyToNull(dto.seoDescription),
        }),
        ...(dto.noIndex !== undefined && { noIndex: dto.noIndex }),
        slug,
        isPublished,
        publishedAt,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async remove(id: string, user: CurrentUserPayload) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Članak nije pronađen.');
    if (
      post.authorId !== user.sub &&
      !user.roles.includes('SYSTEM_ADMIN') &&
      !user.roles.includes('OWNER')
    ) {
      throw new ForbiddenException('Nemate dozvolu za brisanje ovog članka.');
    }
    await this.prisma.blogPost.delete({ where: { id } });
    return { deleted: true };
  }

  private async ensureUniqueSlug(
    base: string,
    excludeId?: string,
  ): Promise<string> {
    let slug = base;
    let n = 0;
    for (;;) {
      const existing = await this.prisma.blogPost.findUnique({
        where: { slug },
      });
      if (!existing || existing.id === excludeId) return slug;
      n++;
      slug = `${base}-${n}`;
    }
  }
}
