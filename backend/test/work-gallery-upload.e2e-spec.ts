import { randomUUID } from 'node:crypto';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import sharp from 'sharp';
import { AuthService } from '../src/auth/auth.service';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { Public } from '../src/common/decorators/public.decorator';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { DailyLogPublicService } from '../src/daily-log/daily-log-public.service';
import { WorkGalleryUploadController } from '../src/daily-log/work-gallery-upload.controller';
import { WorkGalleryUploadService } from '../src/daily-log/work-gallery-upload.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { MediaConsentController } from '../src/media-consent/media-consent.controller';
import { MediaConsentService } from '../src/media-consent/media-consent.service';
import { CLIENT_MEDIA_PUBLICATION_POLICY_VERSION } from '../src/media-consent/media-consent.constants';
import { UploadsRepository } from '../src/uploads/uploads.repository';
import { UploadsService } from '../src/uploads/uploads.service';

function disposableDatabaseUrl(): string {
  const url = new URL(process.env.E2E_DATABASE_URL ?? '');
  const name = decodeURIComponent(url.pathname.slice(1));
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname) || !/(^|[_-])(test|e2e|ci)([_-]|$)/i.test(name)) {
    throw new Error('A disposable local test PostgreSQL database is required');
  }
  return url.toString();
}

@Controller('test-work-gallery-upload-feed')
class FeedController {
  constructor(private readonly feed: DailyLogPublicService) {}
  @Public()
  @Get()
  get(@Query('serviceId') serviceId?: string) {
    return this.feed.findBeforeAfterPairs({ serviceId, limit: 50 });
  }
}

const secret = 'isolated-work-gallery-upload-e2e-secret';

describe('work-gallery private upload (HTTP and real PostgreSQL)', () => {
  let app: INestApplication, db: PrismaService, jwt: JwtService, uploadRoot: string;
  let ownerToken: string, clientToken: string, serviceId: string, otherServiceId: string;
  let userId: string, ownerUserId: string, stylistId: string, categoryId: string, galleryCategoryId: string;
  let entryId: string, hiddenEntryId: string, noClientEntryId: string, pendingEntryId: string, otherServiceEntryId: string;
  let beforeBuffer: Buffer, afterBuffer: Buffer;
  const createdUploads: string[] = [];
  const createdImages: string[] = [];
  const createdConsents: string[] = [];
  const owner = () => `Bearer ${ownerToken}`;

  const pairEndpoint = () => `/api/services/admin/work-gallery/${serviceId}/private-pair`;
  const eligibleEndpoint = () => `/api/services/admin/work-gallery/${serviceId}/eligible-entries`;
  const pendingEndpoint = () => `/api/services/admin/work-gallery/${serviceId}/pending-consent`;

  const uploadPair = (targetEntryId: string, options: { entryId?: string } = {}) =>
    request(app.getHttpServer())
      .post(pairEndpoint())
      .set('Authorization', owner())
      .field('entryId', options.entryId ?? targetEntryId)
      .attach('before', beforeBuffer, { filename: 'before.jpg', contentType: 'image/jpeg' })
      .attach('after', afterBuffer, { filename: 'after.jpg', contentType: 'image/jpeg' });

  beforeAll(async () => {
    uploadRoot = await mkdtemp(join(tmpdir(), 'work-gallery-upload-'));
    const config = new ConfigService({
      DATABASE_URL: disposableDatabaseUrl(),
      DATABASE_PROVIDER: 'postgres',
      JWT_SECRET: secret,
      UPLOAD_ROOT: uploadRoot,
    });
    db = new PrismaService(config);
    await db.$connect();
    // Leftovers of an interrupted run must not influence the counts below.
    const staleUploads = await db.upload.findMany({ where: { pathOriginal: { startsWith: 'private/work-gallery/' } }, select: { id: true } });
    if (staleUploads.length) {
      await db.dailyLogImage.deleteMany({ where: { uploadId: { in: staleUploads.map((upload) => upload.id) } } });
      await db.upload.deleteMany({ where: { id: { in: staleUploads.map((upload) => upload.id) } } });
    }
    const roles: Record<string, string[]> = {};
    const auth = {
      validateUser: async (id: string) =>
        roles[id]
          ? { sub: id, username: id, email: '', roles: roles[id], mustChangePassword: false }
          : null,
    };
    const module = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({ secret })],
      controllers: [WorkGalleryUploadController, MediaConsentController, FeedController],
      providers: [
        WorkGalleryUploadService,
        DailyLogPublicService,
        MediaConsentService,
        UploadsService,
        UploadsRepository,
        RolesGuard,
        JwtStrategy,
        { provide: ConfigService, useValue: config },
        { provide: PrismaService, useValue: db },
        { provide: AuthService, useValue: auth },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    jwt = module.get(JwtService);

    beforeBuffer = await sharp({ create: { width: 24, height: 24, channels: 3, background: '#c9ada7' } }).jpeg().toBuffer();
    afterBuffer = await sharp({ create: { width: 24, height: 24, channels: 3, background: '#4a4e69' } }).jpeg().toBuffer();

    const user = await db.user.create({ data: { username: `upload-${randomUUID()}`, firstName: 'Test', lastName: 'Klijent' } });
    userId = user.id;
    roles[userId] = ['CLIENT'];
    const ownerUser = await db.user.create({ data: { username: `upload-owner-${randomUUID()}`, firstName: 'Test', lastName: 'Vlasnik' } });
    ownerUserId = ownerUser.id;
    roles[ownerUserId] = ['OWNER'];
    ownerToken = jwt.sign({ sub: ownerUserId });
    clientToken = jwt.sign({ sub: userId });
    stylistId = (await db.stylistProfile.create({ data: { userId, status: 'ACTIVE' } })).id;
    categoryId = (await db.serviceCategory.create({ data: { name: 'Upload fixture' } })).id;
    const subcategory = await db.serviceSubcategory.create({ data: { categoryId, name: 'Upload fixture' } });
    serviceId = (await db.service.create({ data: { subcategoryId: subcategory.id, name: 'Upload fixture', durationMinutes: 30, price: 30 } })).id;
    otherServiceId = (await db.service.create({ data: { subcategoryId: subcategory.id, name: 'Upload fixture other', durationMinutes: 30, price: 30 } })).id;
    galleryCategoryId = (await db.galleryCategory.create({ data: { name: 'Upload fixture', autoPublishConsentedPairs: true } })).id;

    const createEntry = (overrides: Record<string, unknown> = {}) =>
      db.dailyLogEntry.create({
        data: {
          stylistProfileId: stylistId,
          serviceId,
          clientId: userId,
          date: new Date('2026-01-01T00:00:00Z'),
          actualPrice: 30,
          publicReferenceCode: randomUUID(),
          status: 'COMPLETED',
          completedAt: new Date('2026-01-01T12:00:00Z'),
          ...overrides,
        },
      });
    entryId = (await createEntry()).id;
    pendingEntryId = (await createEntry()).id;
    hiddenEntryId = (await createEntry({ workGalleryHidden: true })).id;
    noClientEntryId = (await createEntry({ clientId: null })).id;
    otherServiceEntryId = (
      await db.dailyLogEntry.create({
        data: {
          stylistProfileId: stylistId,
          serviceId: otherServiceId,
          clientId: userId,
          date: new Date('2026-01-01T00:00:00Z'),
          actualPrice: 30,
          publicReferenceCode: randomUUID(),
          status: 'COMPLETED',
          completedAt: new Date('2026-01-01T12:00:00Z'),
        },
      })
    ).id;
  });

  afterAll(async () => {
    if (!db) return;
    await db.dailyLogImageConsent.deleteMany({ where: { id: { in: createdConsents } } });
    await db.dailyLogImage.deleteMany({ where: { id: { in: createdImages } } });
    await db.dailyLogEntry.deleteMany({ where: { id: { in: [entryId, pendingEntryId, hiddenEntryId, noClientEntryId, otherServiceEntryId] } } });
    await db.upload.deleteMany({ where: { id: { in: createdUploads } } });
    await db.galleryCategory.deleteMany({ where: { id: galleryCategoryId } });
    await db.serviceCategory.deleteMany({ where: { id: categoryId } });
    await db.stylistProfile.deleteMany({ where: { id: stylistId } });
    await db.user.deleteMany({ where: { id: { in: [userId, ownerUserId] } } });
    if (app) await app.close();
    await db.$disconnect();
    if (uploadRoot) await rm(uploadRoot, { recursive: true, force: true });
  });

  it('requires authentication, an admin role and a valid record id', async () => {
    await request(app.getHttpServer()).post(pairEndpoint()).field('entryId', entryId)
      .attach('before', beforeBuffer, { filename: 'before.jpg', contentType: 'image/jpeg' })
      .attach('after', afterBuffer, { filename: 'after.jpg', contentType: 'image/jpeg' })
      .expect(401);
    await request(app.getHttpServer()).post(pairEndpoint()).set('Authorization', `Bearer ${clientToken}`).field('entryId', entryId)
      .attach('before', beforeBuffer, { filename: 'before.jpg', contentType: 'image/jpeg' })
      .attach('after', afterBuffer, { filename: 'after.jpg', contentType: 'image/jpeg' })
      .expect(403);
    await request(app.getHttpServer()).get(eligibleEndpoint()).expect(401);
    await request(app.getHttpServer()).get(eligibleEndpoint()).set('Authorization', `Bearer ${clientToken}`).expect(403);
    await request(app.getHttpServer()).get(pendingEndpoint()).set('Authorization', owner()).expect(200);
    await request(app.getHttpServer()).get(`${eligibleEndpoint()}?offset=-1`).set('Authorization', owner()).expect(400);
    await request(app.getHttpServer()).get(`${eligibleEndpoint()}?limit=0`).set('Authorization', owner()).expect(400);
    await uploadPair(entryId, { entryId: 'not-a-uuid' }).expect(400);
    await uploadPair(entryId, { entryId: randomUUID() }).expect(404);
    expect(await db.dailyLogImage.count({ where: { dailyLogEntryId: entryId } })).toBe(0);
  });

  it('rejects a missing photo, a wrong file type and an unexpected field', async () => {
    await request(app.getHttpServer()).post(pairEndpoint()).set('Authorization', owner()).field('entryId', entryId)
      .attach('before', beforeBuffer, { filename: 'before.jpg', contentType: 'image/jpeg' })
      .expect(400);
    await request(app.getHttpServer()).post(pairEndpoint()).set('Authorization', owner()).field('entryId', entryId)
      .attach('before', beforeBuffer, { filename: 'before.jpg', contentType: 'image/jpeg' })
      .attach('after', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), { filename: 'after.svg', contentType: 'image/svg+xml' })
      .expect(400);
    await request(app.getHttpServer()).post(pairEndpoint()).set('Authorization', owner()).field('entryId', entryId).field('extra', 'value')
      .attach('before', beforeBuffer, { filename: 'before.jpg', contentType: 'image/jpeg' })
      .attach('after', afterBuffer, { filename: 'after.jpg', contentType: 'image/jpeg' })
      .expect(400);
    expect(await db.dailyLogImage.count({ where: { dailyLogEntryId: entryId } })).toBe(0);
    expect(await db.upload.count({ where: { pathOriginal: { startsWith: 'private/work-gallery/' } } })).toBe(0);
  });

  it('rejects a file whose content is not a real photo', async () => {
    await request(app.getHttpServer()).post(pairEndpoint()).set('Authorization', owner()).field('entryId', entryId)
      .attach('before', Buffer.from('not-a-photo'), { filename: 'before.jpg', contentType: 'image/jpeg' })
      .attach('after', afterBuffer, { filename: 'after.jpg', contentType: 'image/jpeg' })
      .expect(400);
    expect(await db.upload.count({ where: { pathOriginal: { startsWith: 'private/work-gallery/' } } })).toBe(0);
  });

  it('refuses records that are hidden, clientless or belong to another service', async () => {
    for (const target of [hiddenEntryId, noClientEntryId, otherServiceEntryId]) {
      await uploadPair(target).expect(404);
    }
    expect(await db.dailyLogImage.count()).toBe(0);
    expect(await db.upload.count({ where: { pathOriginal: { startsWith: 'private/work-gallery/' } } })).toBe(0);
  });

  it('stores a private pair, grants no consent and keeps it out of the public feed', async () => {
    const response = await uploadPair(entryId).expect(201);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.body).toMatchObject({ entryId, consentRequired: true, storageClass: 'PRIVATE' });

    const images = await db.dailyLogImage.findMany({ where: { dailyLogEntryId: entryId }, include: { upload: true } });
    createdImages.push(...images.map((image) => image.id));
    createdUploads.push(...images.map((image) => image.uploadId));
    expect(images).toHaveLength(2);
    expect(images.filter((image) => image.isBefore)).toHaveLength(1);
    expect(images.filter((image) => image.isAfter)).toHaveLength(1);
    expect(images.every((image) => image.upload.storageClass === 'PRIVATE')).toBe(true);
    expect(images.every((image) => image.upload.pathOriginal.startsWith('private/work-gallery/'))).toBe(true);
    expect(await db.dailyLogImageConsent.count({ where: { dailyLogImageId: { in: images.map((image) => image.id) } } })).toBe(0);

    const feed = (await request(app.getHttpServer()).get(`/test-work-gallery-upload-feed?serviceId=${serviceId}`).expect(200)).body.items;
    expect(feed.map((item: { id: string }) => item.id)).not.toContain(entryId);
    const inbox = await request(app.getHttpServer()).get('/api/media/consents/me').set('Authorization', `Bearer ${clientToken}`).expect(200);
    expect(inbox.body.pending.map((image: { imageId: string }) => image.imageId).sort()).toEqual(images.map((image) => image.id).sort());
    expect(inbox.body.active).toEqual([]);

    const eligible = (await request(app.getHttpServer()).get(eligibleEndpoint()).set('Authorization', owner()).expect(200)).body;
    expect(eligible.items.map((item: { id: string }) => item.id)).not.toContain(entryId);
    expect(eligible.items.map((item: { id: string }) => item.id)).toContain(pendingEntryId);

    const pending = (await request(app.getHttpServer()).get(pendingEndpoint()).set('Authorization', owner()).expect(200)).body;
    expect(pending.items.map((item: { id: string }) => item.id)).toContain(entryId);
    const pendingItem = pending.items.find((item: { id: string }) => item.id === entryId);
    expect(pendingItem.images).toHaveLength(2);
    expect(pendingItem.images.every((image: { private: boolean }) => image.private)).toBe(true);
    expect(JSON.stringify(pending)).not.toContain('pathOriginal');
  });

  it('never overwrites an existing pair', async () => {
    await uploadPair(entryId).expect(409);
    expect(await db.dailyLogImage.count({ where: { dailyLogEntryId: entryId } })).toBe(2);
    expect(await db.upload.count({ where: { pathOriginal: { startsWith: 'private/work-gallery/' } } })).toBe(2);
  });

  it('serializes two simultaneous submissions and removes the private files of the loser', async () => {
    const results = await Promise.all([uploadPair(pendingEntryId), uploadPair(pendingEntryId)]);
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect(await db.dailyLogImage.count({ where: { dailyLogEntryId: pendingEntryId } })).toBe(2);
    const uploads = await db.upload.findMany({ where: { pathOriginal: { startsWith: 'private/work-gallery/' } } });
    createdUploads.push(...uploads.map((upload) => upload.id));
    expect(uploads).toHaveLength(4);
    const files = await readdir(join(uploadRoot, 'private', 'work-gallery'), { recursive: true } as never);
    expect(files.filter((file) => String(file).endsWith('-original.jpg'))).toHaveLength(4);
  });

  it('publishes the pair only after the client consents to both photos', async () => {
    const images = await db.dailyLogImage.findMany({ where: { dailyLogEntryId: entryId }, orderBy: { isBefore: 'desc' } });
    const clientAuthorization = `Bearer ${clientToken}`;
    for (const image of images) {
      await request(app.getHttpServer()).post(`/api/media/consents/${image.id}/grant`)
        .set('Authorization', clientAuthorization)
        .send({ policyVersion: CLIENT_MEDIA_PUBLICATION_POLICY_VERSION })
        .expect(201);
      createdConsents.push((await db.dailyLogImageConsent.findUniqueOrThrow({ where: { dailyLogImageId: image.id } })).id);
    }
    const feed = (await request(app.getHttpServer()).get(`/test-work-gallery-upload-feed?serviceId=${serviceId}`).expect(200)).body.items;
    expect(feed.map((item: { id: string }) => item.id)).toContain(entryId);
    const pending = (await request(app.getHttpServer()).get(pendingEndpoint()).set('Authorization', owner()).expect(200)).body;
    expect(pending.items.map((item: { id: string }) => item.id)).not.toContain(entryId);
  });

  it('removes the pair from the public feed when the client revokes one consent', async () => {
    const images = await db.dailyLogImage.findMany({ where: { dailyLogEntryId: entryId }, orderBy: { isBefore: 'desc' } });
    const clientAuthorization = `Bearer ${clientToken}`;
    const revoked = await request(app.getHttpServer())
      .delete(`/api/media/consents/${images[0].id}`)
      .set('Authorization', clientAuthorization)
      .expect(200);
    expect(revoked.body).toMatchObject({ revoked: true });
    expect(await db.dailyLogImageConsent.count({ where: { dailyLogImageId: images[0].id, revokedAt: null } })).toBe(0);

    // Par sa jednom povučenom saglasnošću NIJE u javnom feedu.
    const feed = (await request(app.getHttpServer()).get(`/test-work-gallery-upload-feed?serviceId=${serviceId}`).expect(200)).body.items;
    expect(feed.map((item: { id: string }) => item.id)).not.toContain(entryId);
    // Vlasnik ga ponovo vidi kao pending (čeka odluku klijenta), ne kao objavljen par.
    const pending = (await request(app.getHttpServer()).get(pendingEndpoint()).set('Authorization', owner()).expect(200)).body;
    expect(pending.items.map((item: { id: string }) => item.id)).toContain(entryId);
    // Ponovno izdavanje saglasnosti vraća par u feed.
    await request(app.getHttpServer()).post(`/api/media/consents/${images[0].id}/grant`)
      .set('Authorization', clientAuthorization)
      .send({ policyVersion: CLIENT_MEDIA_PUBLICATION_POLICY_VERSION })
      .expect(201);
    const restored = (await request(app.getHttpServer()).get(`/test-work-gallery-upload-feed?serviceId=${serviceId}`).expect(200)).body.items;
    expect(restored.map((item: { id: string }) => item.id)).toContain(entryId);
  });

  it('drops the pair from the feed when the record status or client changes', async () => {
    const images = await db.dailyLogImage.findMany({ where: { dailyLogEntryId: pendingEntryId } });
    const clientAuthorization = `Bearer ${clientToken}`;
    for (const image of images) {
      await request(app.getHttpServer()).post(`/api/media/consents/${image.id}/grant`)
        .set('Authorization', clientAuthorization)
        .send({ policyVersion: CLIENT_MEDIA_PUBLICATION_POLICY_VERSION })
        .expect(201);
      createdConsents.push((await db.dailyLogImageConsent.findUniqueOrThrow({ where: { dailyLogImageId: image.id } })).id);
    }
    const feedIds = async () =>
      (await request(app.getHttpServer()).get(`/test-work-gallery-upload-feed?serviceId=${serviceId}`).expect(200)).body.items.map(
        (item: { id: string }) => item.id,
      );
    expect(await feedIds()).toContain(pendingEntryId);

    // 1. Status zapisa više nije COMPLETED → par izlazi iz feeda.
    await db.dailyLogEntry.update({ where: { id: pendingEntryId }, data: { status: 'PENDING' } });
    expect(await feedIds()).not.toContain(pendingEntryId);
    await db.dailyLogEntry.update({ where: { id: pendingEntryId }, data: { status: 'COMPLETED' } });
    expect(await feedIds()).toContain(pendingEntryId);

    // 2. Klijent zapisa se promijenio → saglasnost starog klijenta ne pokriva par.
    const otherClient = await db.user.create({ data: { username: `upload-other-${randomUUID()}`, firstName: 'Test', lastName: 'Drugi' } });
    await db.dailyLogEntry.update({ where: { id: pendingEntryId }, data: { clientId: otherClient.id } });
    expect(await feedIds()).not.toContain(pendingEntryId);
    await db.dailyLogEntry.update({ where: { id: pendingEntryId }, data: { clientId: userId } });
    expect(await feedIds()).toContain(pendingEntryId);
    await db.user.delete({ where: { id: otherClient.id } });
  });
});
