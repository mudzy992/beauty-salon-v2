jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('../blog/utils/sanitize-blog-content', () => ({
  sanitizeBlogContent: (content: string) => content,
}));

import { NotFoundException, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:net';
import request from 'supertest';
import { AuthService } from '../auth/auth.service';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { BlogCommentsService } from '../blog/blog-comments.service';
import { BlogController } from '../blog/blog.controller';
import { BlogService } from '../blog/blog.service';
import { ReviewsController } from '../reviews/reviews.controller';
import { ReviewsService } from '../reviews/reviews.service';

const getHttpServer = (app: INestApplication): Server =>
  app.getHttpServer() as Server;

const TEST_JWT_SECRET = 'security-contract-tests-only-secret';
const clientUser = {
  sub: 'client-1',
  username: 'client',
  email: 'client@example.test',
  roles: ['CLIENT'],
};
const ownerUser = {
  sub: 'owner-1',
  username: 'owner',
  email: 'owner@example.test',
  roles: ['OWNER'],
};

const mockAuthService = {
  validateUser: jest.fn((id: string) => {
    if (id === clientUser.sub) return clientUser;
    if (id === ownerUser.sub) return ownerUser;
    return null;
  }),
};

const mockReviewsService = {
  findOne: jest.fn((id: string) => {
    if (id === 'pending') throw new NotFoundException();
    return {
      id,
      rating: 5,
      comment: 'Odlično iskustvo.',
      user: { firstName: 'Aida', lastName: 'S.' },
    };
  }),
};

const mockBlogService = {
  findAllPublic: jest.fn((pagination?: { limit?: number; offset?: number }) => {
    const limit = pagination?.limit ?? 20;
    const offset = pagination?.offset ?? 0;
    return {
      items: [
        {
          id: 'published-1',
          title: 'Objavljen',
          slug: 'objavljen',
          excerpt: 'Sažetak',
        },
      ],
      total: 1,
      limit,
      offset,
      hasMore: false,
      nextOffset: offset + 1,
    };
  }),
  findAllForAdmin: jest.fn(() => [
    { id: 'draft-1', title: 'Nacrt', isPublished: false },
  ]),
  findBySlug: jest.fn((slug: string) => ({ id: 'published-1', slug })),
  findOne: jest.fn((id: string) => ({ id, isPublished: false })),
};

const mockBlogCommentsService = {
  findPublicForPost: jest.fn(
    (postId: string, pagination?: { limit?: number; offset?: number }) => {
      const limit = pagination?.limit ?? 20;
      const offset = pagination?.offset ?? 0;
      return {
        items: [{ id: 'approved-1', postId, content: 'Odobren komentar.' }],
        total: 1,
        limit,
        offset,
        hasMore: false,
        nextOffset: offset + 1,
      };
    },
  ),
  findAllForPost: jest.fn((postId: string) => [
    { id: 'pending-1', postId, content: 'Čeka moderaciju.', isApproved: false },
  ]),
};

describe('HTTP security contracts for reviews and public blog reads', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let clientToken: string;
  let ownerToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: TEST_JWT_SECRET }),
      ],
      controllers: [ReviewsController, BlogController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: ConfigService,
          useValue: {
            get: (_key: string, defaultValue?: string) =>
              TEST_JWT_SECRET || defaultValue,
          },
        },
        { provide: ReviewsService, useValue: mockReviewsService },
        { provide: BlogService, useValue: mockBlogService },
        { provide: BlogCommentsService, useValue: mockBlogCommentsService },
        JwtStrategy,
        RolesGuard,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    jwtService = moduleRef.get(JwtService);
    clientToken = jwtService.sign({ sub: clientUser.sub });
    ownerToken = jwtService.sign({ sub: ownerUser.sub });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires authentication for review detail, returns the display response, and hides pending reviews', async () => {
    await request(getHttpServer(app)).get('/api/reviews/review-1').expect(401);

    const response = await request(getHttpServer(app))
      .get('/api/reviews/review-1')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    expect(response.body).toEqual({
      id: 'review-1',
      rating: 5,
      comment: 'Odlično iskustvo.',
      user: { firstName: 'Aida', lastName: 'S.' },
    });
    expect(response.body).not.toHaveProperty('user.passwordHash');
    await request(getHttpServer(app))
      .get('/api/reviews/pending')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(404);
  });

  it('keeps public blog list/comments public with bounded pagination', async () => {
    const posts = await request(getHttpServer(app))
      .get('/api/blog?limit=5&offset=2')
      .expect(200);
    expect(posts.body).toEqual({
      items: [
        {
          id: 'published-1',
          title: 'Objavljen',
          slug: 'objavljen',
          excerpt: 'Sažetak',
        },
      ],
      total: 1,
      limit: 5,
      offset: 2,
      hasMore: false,
      nextOffset: 3,
    });
    expect(mockBlogService.findAllPublic).toHaveBeenCalledWith({
      limit: 5,
      offset: 2,
    });

    const defaultPosts = await request(getHttpServer(app))
      .get('/api/blog')
      .expect(200);
    expect(defaultPosts.body.limit).toBe(20);
    expect(defaultPosts.body.offset).toBe(0);
    expect(mockBlogService.findAllPublic).toHaveBeenLastCalledWith({
      limit: 20,
      offset: 0,
    });

    const comments = await request(getHttpServer(app))
      .get('/api/blog/post-1/comments?limit=3&offset=4')
      .expect(200);
    expect(comments.body).toEqual({
      items: [
        { id: 'approved-1', postId: 'post-1', content: 'Odobren komentar.' },
      ],
      total: 1,
      limit: 3,
      offset: 4,
      hasMore: false,
      nextOffset: 5,
    });
    expect(mockBlogCommentsService.findPublicForPost).toHaveBeenCalledWith(
      'post-1',
      { limit: 3, offset: 4 },
    );

    const defaultComments = await request(getHttpServer(app))
      .get('/api/blog/post-1/comments')
      .expect(200);
    expect(defaultComments.body.limit).toBe(20);
    expect(defaultComments.body.offset).toBe(0);
    expect(mockBlogCommentsService.findPublicForPost).toHaveBeenLastCalledWith(
      'post-1',
      { limit: 20, offset: 0 },
    );

    await request(getHttpServer(app))
      .get('/api/blog?published=false')
      .expect(400);
    await request(getHttpServer(app))
      .get('/api/blog/post-1/comments?approved=false')
      .expect(400);
  });

  it('restricts blog drafts and admin reads to owner/admin roles', async () => {
    await request(getHttpServer(app))
      .get('/api/blog/admin')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);
    await request(getHttpServer(app))
      .get('/api/blog/draft-1')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);

    const adminPosts = await request(getHttpServer(app))
      .get('/api/blog/admin')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(adminPosts.body).toEqual([
      { id: 'draft-1', title: 'Nacrt', isPublished: false },
    ]);
  });
});
