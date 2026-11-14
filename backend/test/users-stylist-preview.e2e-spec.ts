import { randomUUID } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsersRepository } from '../src/users/users.repository';
import { UsersService } from '../src/users/users.service';
import type { EventsGateway } from '../src/events/events.gateway';

// Only disposable local databases are accepted; no test ever connects to production.
function testDatabaseUrl(): string {
  const url = new URL(process.env.E2E_DATABASE_URL ?? '');
  const name = decodeURIComponent(url.pathname.slice(1));
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
      !['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname) ||
      !/(^|[_-])(test|e2e|ci)([_-]|$)/i.test(name)) {
    throw new Error('A disposable local test PostgreSQL database is required');
  }
  return url.toString();
}

describe('stylist removal revision (real PostgreSQL)', () => {
  let db: PrismaService;
  let users: UsersService;
  let userId: string;
  let profileId: string;
  let categoryId: string;
  let serviceId: string;
  const role = { mode: 'DELETE' as const };
  const choices = { dailyLogs: role, confirmedReservations: role, reservationResponses: role, reviews: role };
  beforeAll(async () => {
    db = new PrismaService(new ConfigService({ DATABASE_URL: testDatabaseUrl(), DATABASE_PROVIDER: 'postgres' }));
    await db.$connect();
    users = new UsersService(new UsersRepository(db), { disconnectUserSockets: jest.fn() } as unknown as EventsGateway);
    const user = await db.user.create({ data: { username: `preview-${randomUUID()}`, firstName: 'Fixture', lastName: 'Stylist' } });
    userId = user.id;
    profileId = (await db.stylistProfile.create({ data: { userId, status: 'ACTIVE' } })).id;
    const category = await db.serviceCategory.create({ data: { name: 'Fixture category' } });
    categoryId = category.id;
    const subcategory = await db.serviceSubcategory.create({ data: { name: 'Fixture subcategory', categoryId } });
    serviceId = (await db.service.create({ data: { name: 'Fixture service', subcategoryId: subcategory.id, durationMinutes: 30, price: 10 } })).id;
  });
  afterAll(async () => {
    if (db) {
      if (profileId) await db.clientDebt.deleteMany({ where: { stylistProfileId: profileId } });
      if (userId) await db.user.deleteMany({ where: { id: userId } });
      if (categoryId) await db.serviceCategory.deleteMany({ where: { id: categoryId } });
      await db.$disconnect();
    }
  });
  it('rejects a stale preview and preserves newly linked data, then accepts a fresh explicit confirmation', async () => {
    const original = await users.getStylistRemovalPreview(userId, ['OWNER']);
    expect(original.counts.reviewsCount).toBe(0);
    const review = await db.review.create({ data: { userId, serviceId, stylistProfileId: profileId, serviceRating: 5 } });
    await expect(users.removeStylistRole(userId, { ...choices, previewRevision: original.revision }, ['OWNER'])).rejects.toBeInstanceOf(ConflictException);
    expect(await db.review.findUnique({ where: { id: review.id } })).not.toBeNull();
    expect(await db.stylistProfile.findUnique({ where: { id: profileId } })).not.toBeNull();
    const refreshed = await users.getStylistRemovalPreview(userId, ['OWNER']);
    expect(refreshed.counts.reviewsCount).toBe(1);
    const debt = await db.clientDebt.create({ data: { clientId: userId, stylistProfileId: profileId, createdById: userId, amount: 10 } });
    await expect(users.removeStylistRole(userId, { ...choices, previewRevision: refreshed.revision }, ['OWNER'])).rejects.toBeInstanceOf(ConflictException);
    expect(await db.clientDebt.findUnique({ where: { id: debt.id } })).not.toBeNull();
    expect(await db.review.findUnique({ where: { id: review.id } })).not.toBeNull();
    await db.clientDebt.delete({ where: { id: debt.id } });
    await users.removeStylistRole(userId, { ...choices, previewRevision: refreshed.revision }, ['OWNER']);
    expect(await db.review.findUnique({ where: { id: review.id } })).toBeNull();
    expect(await db.stylistProfile.findUnique({ where: { id: profileId } })).toBeNull();
  });
});
