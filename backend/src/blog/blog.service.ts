import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { optionalSeoFields, slugSource } from './utils/blog-post-data';
import { emptyToNull } from '../common/utils/empty-to-null';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

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
        content: dto.content,
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

  async findAll(publishedOnly = false) {
    const posts = await this.prisma.blogPost.findMany({
      where: publishedOnly ? { isPublished: true } : undefined,
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const pendingByPost = await this.prisma.blogComment.groupBy({
      by: ['postId'],
      where: {
        isApproved: false,
        ...(publishedOnly ? { post: { isPublished: true } } : {}),
      },
      _count: { _all: true },
    });
    const pendingMap = new Map(pendingByPost.map((x) => [x.postId, x._count._all]));

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
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        comments: {
          where: { isApproved: true },
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
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.excerpt !== undefined && { excerpt: emptyToNull(dto.excerpt) }),
        ...(dto.heroImage !== undefined && { heroImage: emptyToNull(dto.heroImage) }),
        ...(dto.ogImage !== undefined && { ogImage: emptyToNull(dto.ogImage) }),
        ...(dto.seoTitle !== undefined && { seoTitle: emptyToNull(dto.seoTitle) }),
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
