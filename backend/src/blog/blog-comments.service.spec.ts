jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('../settings/settings.service', () => ({
  SettingsService: class SettingsService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BlogCommentsService } from './blog-comments.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

const mockPrisma = {
  blogComment: {
    findMany: jest.fn(),
  },
};

describe('BlogCommentsService public/admin lists', () => {
  let service: BlogCommentsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogCommentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SettingsService, useValue: {} },
      ],
    }).compile();
    service = module.get<BlogCommentsService>(BlogCommentsService);
  });

  it('public comments require an approved comment on a published post', async () => {
    mockPrisma.blogComment.findMany.mockResolvedValue([]);

    await service.findPublicForPost('post-1');

    expect(mockPrisma.blogComment.findMany).toHaveBeenCalledWith({
      where: {
        postId: 'post-1',
        isApproved: true,
        post: { isPublished: true },
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('admin comments can include pending comments for the requested post', async () => {
    mockPrisma.blogComment.findMany.mockResolvedValue([]);

    await service.findAllForPost('post-1');

    expect(mockPrisma.blogComment.findMany).toHaveBeenCalledWith({
      where: { postId: 'post-1' },
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
  });
});
