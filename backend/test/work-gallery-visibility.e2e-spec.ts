import { randomUUID } from 'node:crypto';
import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthService } from '../src/auth/auth.service';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { Public } from '../src/common/decorators/public.decorator';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { DailyLogPublicService } from '../src/daily-log/daily-log-public.service';
import { WorkGalleryVisibilityController } from '../src/daily-log/work-gallery-visibility.controller';
import { WorkGalleryVisibilityService } from '../src/daily-log/work-gallery-visibility.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { MediaConsentService } from '../src/media-consent/media-consent.service';
import { UploadsService } from '../src/uploads/uploads.service';

function disposableDatabaseUrl(): string {
  const url = new URL(process.env.E2E_DATABASE_URL ?? '');
  const name = decodeURIComponent(url.pathname.slice(1));
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname) || !/(^|[_-])(test|e2e|ci)([_-]|$)/i.test(name)) {
    throw new Error('A disposable local test PostgreSQL database is required');
  }
  return url.toString();
}

@Controller('test-work-gallery-feed')
class FeedController {
  constructor(private readonly feed: DailyLogPublicService) {}
  @Public()
  @Get()
  get(@Query('serviceId') serviceId?: string, @Query('random') random?: string) {
    return this.feed.findBeforeAfterPairs({ serviceId, random: random === 'true' });
  }
}

const secret = 'isolated-work-gallery-e2e-secret';

describe('work-gallery visibility (HTTP and real PostgreSQL)', () => {
  let app: INestApplication, db: PrismaService, jwt: JwtService;
  let ownerToken: string, clientToken: string, serviceId: string, entryId: string;
  let userId: string, stylistId: string, categoryId: string, galleryCategoryId: string;
  const uploads: string[] = [], images: string[] = [], consents: string[] = [];
  const endpoint = () => `/api/services/admin/work-gallery/${serviceId}/entries/${entryId}/visibility`;
  const owner = () => `Bearer ${ownerToken}`;

  beforeAll(async () => {
    const config = new ConfigService({ DATABASE_URL: disposableDatabaseUrl(), DATABASE_PROVIDER: 'postgres', JWT_SECRET: secret });
    db = new PrismaService(config);
    await db.$connect();
    const roles: Record<string, string[]> = { owner: ['OWNER'], client: ['CLIENT'] };
    const auth = { validateUser: async (id: string) => roles[id] ? { sub: id, username: id, email: '', roles: roles[id], mustChangePassword: false } : null };
    const module = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({ secret })],
      controllers: [WorkGalleryVisibilityController, FeedController],
      providers: [WorkGalleryVisibilityService, DailyLogPublicService, RolesGuard, JwtStrategy,
        { provide: ConfigService, useValue: config }, { provide: PrismaService, useValue: db },
        { provide: AuthService, useValue: auth }, { provide: APP_GUARD, useClass: JwtAuthGuard }],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    jwt = module.get(JwtService);
    ownerToken = jwt.sign({ sub: 'owner' });
    clientToken = jwt.sign({ sub: 'client' });

    const user = await db.user.create({ data: { username: `gallery-${randomUUID()}`, firstName: 'Fixture', lastName: 'Client' } });
    userId = user.id;
    stylistId = (await db.stylistProfile.create({ data: { userId, status: 'ACTIVE' } })).id;
    categoryId = (await db.serviceCategory.create({ data: { name: 'Gallery fixture' } })).id;
    const subcategory = await db.serviceSubcategory.create({ data: { categoryId, name: 'Gallery fixture' } });
    serviceId = (await db.service.create({ data: { subcategoryId: subcategory.id, name: 'Gallery fixture', durationMinutes: 30, price: 30 } })).id;
    galleryCategoryId = (await db.galleryCategory.create({ data: { name: 'Gallery fixture', autoPublishConsentedPairs: true } })).id;
    entryId = (await db.dailyLogEntry.create({ data: { stylistProfileId: stylistId, serviceId, clientId: userId, date: new Date('2026-01-01T00:00:00Z'), actualPrice: 30, publicReferenceCode: randomUUID(), status: 'COMPLETED', completedAt: new Date('2026-01-01T12:00:00Z') } })).id;
    for (const side of ['before', 'after']) {
      const original = await db.upload.create({ data: { originalName: `${side}.jpg`, mimeType: 'image/jpeg', sizeBytes: 1, pathOriginal: `private/${randomUUID()}.jpg`, storageClass: 'PRIVATE', uploadedById: userId } });
      const derivative = await db.upload.create({ data: { originalName: `${side}.webp`, mimeType: 'image/webp', sizeBytes: 1, pathOriginal: `private/${randomUUID()}.webp`, storageClass: 'CONSENTED_PUBLIC' } });
      uploads.push(original.id, derivative.id);
      const image = await db.dailyLogImage.create({ data: { dailyLogEntryId: entryId, uploadId: original.id, isBefore: side === 'before', isAfter: side === 'after' } });
      images.push(image.id);
      const consent = await db.dailyLogImageConsent.create({ data: { dailyLogImageId: image.id, clientId: userId, policyVersion: 'client-media-publication-v1', consentedAt: new Date(), publishedUploadId: derivative.id } });
      consents.push(consent.id);
    }
  });

  afterAll(async () => {
    if (!db) return;
    await db.dailyLogImageConsent.deleteMany({ where: { id: { in: consents } } });
    await db.dailyLogImage.deleteMany({ where: { id: { in: images } } });
    await db.dailyLogEntry.deleteMany({ where: { id: entryId } });
    await db.upload.deleteMany({ where: { id: { in: uploads } } });
    await db.galleryCategory.deleteMany({ where: { id: galleryCategoryId } });
    await db.serviceCategory.deleteMany({ where: { id: categoryId } });
    await db.stylistProfile.deleteMany({ where: { id: stylistId } });
    await db.user.deleteMany({ where: { id: userId } });
    if (app) await app.close();
    await db.$disconnect();
  });

  it('enforces authentication, role, strict booleans and service ownership', async () => {
    const body = { hidden: true, expectedHidden: false };
    await request(app.getHttpServer()).patch(endpoint()).send(body).expect(401);
    await request(app.getHttpServer()).patch(endpoint()).set('Authorization', `Bearer ${clientToken}`).send(body).expect(403);
    await request(app.getHttpServer()).get(`/api/services/admin/work-gallery/${serviceId}/hidden`).expect(401);
    await request(app.getHttpServer()).get(`/api/services/admin/work-gallery/${serviceId}/hidden`).set('Authorization', `Bearer ${clientToken}`).expect(403);
    await request(app.getHttpServer()).get(`/api/services/admin/work-gallery/${serviceId}/hidden?offset=-1`).set('Authorization', owner()).expect(400);
    await request(app.getHttpServer()).patch(endpoint()).set('Authorization', owner()).send({ ...body, hidden: 'true' }).expect(400);
    await request(app.getHttpServer()).patch(endpoint()).set('Authorization', owner()).send({ ...body, extra: 1 }).expect(400);
    await request(app.getHttpServer()).patch(`/api/services/admin/work-gallery/wrong-service/entries/${entryId}/visibility`).set('Authorization', owner()).send(body).expect(404);
    expect((await db.dailyLogEntry.findUniqueOrThrow({ where: { id: entryId } })).workGalleryHidden).toBe(false);
  });

  it('hides across service, global and random feeds without deleting originals or consents; restore still requires both consents', async () => {
    const feed = (suffix = '') => request(app.getHttpServer()).get(`/test-work-gallery-feed${suffix}`);
    expect((await feed(`?serviceId=${serviceId}`).expect(200)).body.items.map((item: { id: string }) => item.id)).toContain(entryId);
    const inbox = new MediaConsentService(db, {} as UploadsService);
    const client = { sub: userId, roles: ['CLIENT'] };
    expect((await inbox.listForClient(client)).active.every(image => image.isPublished)).toBe(true);
    await request(app.getHttpServer()).patch(endpoint()).set('Authorization', owner()).send({ hidden: true, expectedHidden: false }).expect(200);
    expect((await inbox.listForClient(client)).active.every(image => !image.isPublished)).toBe(true);
    for (const suffix of [`?serviceId=${serviceId}`, '', '?random=true']) {
      expect((await feed(suffix).expect(200)).body.items.map((item: { id: string }) => item.id)).not.toContain(entryId);
    }
    const hiddenList = await request(app.getHttpServer()).get(`/api/services/admin/work-gallery/${serviceId}/hidden?limit=1`).set('Authorization', owner()).expect(200);
    expect(hiddenList.body.items).toEqual([{ id: entryId, completedAt: '2026-01-01T12:00:00.000Z' }]);
    expect(hiddenList.body).toMatchObject({ nextOffset: 1, hasMore: false });
    expect(await db.dailyLogImage.count({ where: { id: { in: images } } })).toBe(2);
    expect(await db.upload.count({ where: { id: { in: uploads } } })).toBe(4);
    expect(await db.dailyLogImageConsent.count({ where: { id: { in: consents }, revokedAt: null } })).toBe(2);
    await request(app.getHttpServer()).patch(endpoint()).set('Authorization', owner()).send({ hidden: true, expectedHidden: false }).expect(409);
    await db.dailyLogImageConsent.update({ where: { id: consents[0] }, data: { revokedAt: new Date() } });
    await request(app.getHttpServer()).patch(endpoint()).set('Authorization', owner()).send({ hidden: false, expectedHidden: true }).expect(200);
    expect((await feed(`?serviceId=${serviceId}`).expect(200)).body.items.map((item: { id: string }) => item.id)).not.toContain(entryId);
    await db.dailyLogImageConsent.update({ where: { id: consents[0] }, data: { revokedAt: null } });
    expect((await feed(`?serviceId=${serviceId}`).expect(200)).body.items.map((item: { id: string }) => item.id)).toContain(entryId);
    expect((await inbox.listForClient(client)).active.every(image => image.isPublished)).toBe(true);
  });

  it('lists hidden entries in bounded, stable pages without client data', async () => {
    const ids: string[] = [];
    try {
      for (let index = 0; index < 3; index++) {
        const entry = await db.dailyLogEntry.create({ data: { stylistProfileId: stylistId, serviceId, clientId: userId, date: new Date('2026-01-01T00:00:00Z'), actualPrice: 30, publicReferenceCode: randomUUID(), status: 'COMPLETED', completedAt: new Date('2026-01-01T12:00:00Z'), workGalleryHidden: true } });
        ids.push(entry.id);
      }
      const first = await request(app.getHttpServer()).get(`/api/services/admin/work-gallery/${serviceId}/hidden?limit=2`).set('Authorization', owner()).expect(200);
      expect(first.body.items.map((entry: { id: string }) => entry.id)).toEqual([...ids].sort().reverse().slice(0, 2));
      expect(first.body).toMatchObject({ hasMore: true, nextOffset: 2 });
      expect(Object.keys(first.body.items[0]).sort()).toEqual(['completedAt', 'id']);
      const second = await request(app.getHttpServer()).get(`/api/services/admin/work-gallery/${serviceId}/hidden?limit=2&offset=2`).set('Authorization', owner()).expect(200);
      expect(second.body.items.map((entry: { id: string }) => entry.id)).toEqual([...ids].sort().reverse().slice(2));
      expect(second.body).toMatchObject({ hasMore: false, nextOffset: 3 });
    } finally {
      await db.dailyLogEntry.deleteMany({ where: { id: { in: ids } } });
    }
  });

  it('accepts only one of two simultaneous actions with the same expected state', async () => {
    const send = () => request(app.getHttpServer()).patch(endpoint()).set('Authorization', owner()).send({ hidden: true, expectedHidden: false });
    const results = await Promise.all([send(), send()]);
    expect(results.map(result => result.status).sort()).toEqual([200, 409]);
    expect((await db.dailyLogEntry.findUniqueOrThrow({ where: { id: entryId } })).workGalleryHidden).toBe(true);
  });
});
