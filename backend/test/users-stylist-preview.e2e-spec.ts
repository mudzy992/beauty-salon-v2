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
  it('does not silently remove records committed while removal is running', async () => {
    const other = await db.user.create({ data: { username: `race-${randomUUID()}`, firstName: 'Race', lastName: 'Stylist' } });
    const profile = await db.stylistProfile.create({ data: { userId: other.id, status: 'ACTIVE' } });
    const repository = new UsersRepository(db);
    const service = new UsersService(repository, { disconnectUserSockets: jest.fn() } as unknown as EventsGateway);
    try {
      const preview = await service.getStylistRemovalPreview(other.id, ['OWNER']);
      let release!: () => void;
      let read!: () => void;
      const paused = new Promise<void>(resolve => { read = resolve; });
      const gate = new Promise<void>(resolve => { release = resolve; });
      const originalTransaction = repository.serializableTransaction.bind(repository);
      jest.spyOn(repository, 'serializableTransaction').mockImplementation((callback) => originalTransaction(async tx => {
        const wrapped = new Proxy(tx, {
          get(target, key, receiver) {
            if (key !== 'review') return Reflect.get(target, key, receiver);
            return new Proxy(target.review, {
              get(model, method, modelReceiver) {
                if (method !== 'findMany') return Reflect.get(model, method, modelReceiver);
                return async (...args: Parameters<typeof model.findMany>) => {
                  const result = await model.findMany(...args);
                  read();
                  await gate;
                  return result;
                };
              },
            });
          },
        });
        return callback(wrapped);
      }));
      const removal = service.removeStylistRole(other.id, { ...choices, previewRevision: preview.revision }, ['OWNER']);
      await paused;
      const review = await db.review.create({ data: { userId: other.id, serviceId, stylistProfileId: profile.id, serviceRating: 5 } });
      release();
      await expect(removal).rejects.toBeDefined();
      expect(await db.review.findUnique({ where: { id: review.id } })).not.toBeNull();
      expect(await db.stylistProfile.findUnique({ where: { id: profile.id } })).not.toBeNull();
    } finally {
      await db.user.deleteMany({ where: { id: other.id } });
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
    const book = await db.incomeBook.create({ data: { year: 3026, month: 7 } });
    const manual = await db.incomeBookManualEntry.create({ data: {
      bookId: book.id, serviceId, stylistProfileId: profileId, createdById: userId,
      date: new Date('2026-01-01T00:00:00Z'), amount: 25,
    } });
    const settled = await db.clientDebt.create({ data: {
      clientId: userId, stylistProfileId: profileId, createdById: userId, amount: 5, status: 'SETTLED',
    } });
    const financialPreview = await users.getStylistRemovalPreview(userId, ['OWNER']);
    expect(financialPreview.financial).toMatchObject({ clientDebtsCount: 2, manualIncomeCount: 1 });
    await expect(users.removeStylistRole(userId, { ...choices, previewRevision: financialPreview.revision }, ['OWNER'])).rejects.toBeDefined();
    const targetUser = await db.user.create({ data: { username: `target-${randomUUID()}`, firstName: 'Target', lastName: 'Stylist' } });
    const target = await db.stylistProfile.create({ data: { userId: targetUser.id, status: 'ACTIVE' } });
    try {
      await users.removeStylistRole(userId, { ...choices, previewRevision: financialPreview.revision,
        financialTargetStylistProfileId: target.id, confirmFinancialTransfer: true }, ['OWNER']);
      expect(await db.clientDebt.findUnique({ where: { id: debt.id } })).toMatchObject({ stylistProfileId: target.id });
      expect(await db.clientDebt.findUnique({ where: { id: settled.id } })).toMatchObject({ stylistProfileId: target.id, status: 'SETTLED' });
      expect(await db.incomeBookManualEntry.findUnique({ where: { id: manual.id } })).toMatchObject({ stylistProfileId: target.id });
      await db.clientDebt.deleteMany({ where: { stylistProfileId: target.id } });
      await db.incomeBookManualEntry.delete({ where: { id: manual.id } });
      await db.incomeBook.delete({ where: { id: book.id } });
    } finally {
      await db.clientDebt.deleteMany({ where: { stylistProfileId: target.id } });
      await db.incomeBookManualEntry.deleteMany({ where: { id: manual.id } });
      await db.incomeBook.deleteMany({ where: { id: book.id } });
      await db.user.deleteMany({ where: { id: targetUser.id } });
    }
    expect(await db.review.findUnique({ where: { id: review.id } })).toBeNull();
    expect(await db.stylistProfile.findUnique({ where: { id: profileId } })).toBeNull();
  });
});
