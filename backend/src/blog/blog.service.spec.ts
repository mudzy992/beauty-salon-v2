import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BlogService } from './blog.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  blogPost: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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

  it('findOne baca NotFoundException kada članak ne postoji', async () => {
    mockPrisma.blogPost.findUnique.mockResolvedValue(null);
    await expect(service.findOne('nope')).rejects.toThrow(NotFoundException);
  });

  it('findBySlug baca NotFoundException kada slug ne postoji', async () => {
    mockPrisma.blogPost.findUnique.mockResolvedValue(null);
    await expect(service.findBySlug('nema')).rejects.toThrow(NotFoundException);
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
      service.update('p1', { title: 'Novi naslov' }, user as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('create upisuje SEO polja', async () => {
    mockPrisma.blogPost.findUnique.mockResolvedValue(null);
    mockPrisma.blogPost.create.mockResolvedValue({ id: 'p1' });
    await service.create(
      {
        title: 'Naslov',
        content: 'Tekst',
        excerpt: 'Kratko',
        seoTitle: 'SEO naslov',
        seoDescription: 'SEO opis',
        noIndex: true,
      },
      'author-1',
    );
    expect(mockPrisma.blogPost.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          excerpt: 'Kratko',
          seoTitle: 'SEO naslov',
          seoDescription: 'SEO opis',
          noIndex: true,
        }),
      }),
    );
  });
});
