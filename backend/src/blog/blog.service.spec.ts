jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('./utils/sanitize-blog-content', () => ({
  sanitizeBlogContent: jest.fn((content: string) => `safe:${content}`),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BlogService } from './blog.service';
import { PrismaService } from '../prisma/prisma.service';

type BlogPostCreateArgs = { data: Record<string, unknown> };
type BlogPostUpdateArgs = { data: Record<string, unknown> };

const mockPrisma = {
  blogPost: {
    create: jest.fn<Promise<unknown>, [args: BlogPostCreateArgs]>(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn<Promise<unknown>, [args: BlogPostUpdateArgs]>(),
    delete: jest.fn(),
  },
  blogComment: {
    groupBy: jest.fn(),
  },
};

describe('BlogService', () => {
  let service: BlogService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<BlogService>(BlogService);
  });

  it('public post list is always published-only and uses a display allowlist', async () => {
    mockPrisma.blogPost.findMany.mockResolvedValue([{ id: 'public-1' }]);

    await service.findAllPublic();

    expect(mockPrisma.blogPost.findMany).toHaveBeenCalledWith({
      where: { isPublished: true },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        heroImage: true,
        isPublished: true,
        publishedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('admin post list keeps drafts and pending comment counts in the admin projection', async () => {
    mockPrisma.blogPost.findMany.mockResolvedValue([
      { id: 'draft-1', _count: { comments: 2 } },
    ]);
    mockPrisma.blogComment.groupBy.mockResolvedValue([
      { postId: 'draft-1', _count: { _all: 1 } },
    ]);

    const result: unknown = await service.findAllForAdmin();

    expect(result).toEqual([
      {
        id: 'draft-1',
        _count: { comments: 2 },
        commentsTotalCount: 2,
        commentsPendingCount: 1,
      },
    ]);
    expect(mockPrisma.blogPost.findMany).toHaveBeenCalledWith({
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(mockPrisma.blogComment.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isApproved: false },
      }),
    );
  });

  it('public slug lookup only selects published display fields', async () => {
    mockPrisma.blogPost.findUnique.mockResolvedValue({
      id: 'published-1',
      content: '<p>Legacy content</p>',
    });

    const result: unknown = await service.findBySlug('published-slug');
    expect(result).toMatchObject({ content: 'safe:<p>Legacy content</p>' });

    expect(mockPrisma.blogPost.findUnique).toHaveBeenCalledWith({
      where: { slug: 'published-slug', isPublished: true },
      select: {
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
      },
    });
  });

  it('findOne baca NotFoundException kada članak ne postoji', async () => {
    mockPrisma.blogPost.findUnique.mockResolvedValue(null);
    await expect(service.findOne('nope')).rejects.toThrow(NotFoundException);
  });

  it('findBySlug baca NotFoundException kada slug ne postoji', async () => {
    mockPrisma.blogPost.findUnique.mockResolvedValue(null);
    await expect(service.findBySlug('nema')).rejects.toThrow(NotFoundException);
  });

  it('update sanitizes blog HTML before persisting it', async () => {
    mockPrisma.blogPost.findUnique.mockResolvedValue({
      id: 'p1',
      authorId: 'author-1',
    });
    mockPrisma.blogPost.update.mockResolvedValue({ id: 'p1' });

    await service.update(
      'p1',
      {
        content: '<p onmouseover="alert(1)">Sadržaj</p><script>bad()</script>',
      },
      {
        sub: 'author-1',
        username: 'author',
        email: 'author@example.com',
        roles: ['CLIENT'],
      },
    );

    const updateCall = mockPrisma.blogPost.update.mock.calls[0]?.[0];
    expect(updateCall.data.content).toBe(
      'safe:<p onmouseover="alert(1)">Sadržaj</p><script>bad()</script>',
    );
  });

  it('update baca ForbiddenException kada user nije autor niti admin', async () => {
    mockPrisma.blogPost.findUnique.mockResolvedValue({
      id: 'p1',
      authorId: 'other-author',
    });
    const user = {
      sub: 'user-1',
      username: 'u',
      email: 'e@e.com',
      roles: ['CLIENT'],
    };
    await expect(
      service.update('p1', { title: 'Novi naslov' }, user),
    ).rejects.toThrow(ForbiddenException);
  });

  it('create upisuje SEO polja', async () => {
    mockPrisma.blogPost.findUnique.mockResolvedValue(null);
    mockPrisma.blogPost.create.mockResolvedValue({ id: 'p1' });
    await service.create(
      {
        title: 'Naslov',
        content: '<p onclick="alert(1)">Tekst</p><script>alert(2)</script>',
        excerpt: 'Kratko',
        seoTitle: 'SEO naslov',
        seoDescription: 'SEO opis',
        noIndex: true,
      },
      'author-1',
    );
    const createCall = mockPrisma.blogPost.create.mock.calls[0]?.[0];
    expect(createCall?.data).toMatchObject({
      content: 'safe:<p onclick="alert(1)">Tekst</p><script>alert(2)</script>',
      excerpt: 'Kratko',
      seoTitle: 'SEO naslov',
      seoDescription: 'SEO opis',
      noIndex: true,
    });
  });
});
