import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException } from '@nestjs/common';
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
      if (userId) await db.stylistFinancialTransferAudit.deleteMany({ where: { sourceUserId: userId } });
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
      const removal = service.removeStylistRole(other.id, { ...choices, previewRevision: preview.revision }, ['OWNER'], userId);
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

  it('preserves booked income when deletion is requested and permits explicit daily-log transfer', async () => {
    const source = await db.user.create({ data: { username: `booked-${randomUUID()}`, firstName: 'Booked', lastName: 'Source' } });
    const targetUser = await db.user.create({ data: { username: `booked-target-${randomUUID()}`, firstName: 'Booked', lastName: 'Target' } });
    const sourceProfile = await db.stylistProfile.create({ data: { userId: source.id, status: 'ACTIVE' } });
    const target = await db.stylistProfile.create({ data: { userId: targetUser.id, status: 'ACTIVE' } });
    const book = await db.incomeBook.create({ data: { year: 3026, month: 8 } });
    try {
      const log = await db.dailyLogEntry.create({ data: { stylistProfileId: sourceProfile.id, serviceId,
        date: new Date('2026-01-01T00:00:00Z'), actualPrice: 10, publicReferenceCode: randomUUID() } });
      const previewBeforeBooking = await users.getStylistRemovalPreview(source.id, ['OWNER']);
      const entry = await db.incomeBookEntry.create({ data: { bookId: book.id, dailyLogEntryId: log.id,
        amount: 10, date: new Date('2026-01-01T00:00:00Z') } });
      await expect(users.removeStylistRole(source.id, { ...choices, previewRevision: previewBeforeBooking.revision }, ['OWNER'], userId)).rejects.toBeInstanceOf(ConflictException);
      const preview = await users.getStylistRemovalPreview(source.id, ['OWNER']);
      expect(preview.financial.bookedDailyLogsCount).toBe(1);
      await expect(users.removeStylistRole(source.id, { ...choices, previewRevision: preview.revision }, ['OWNER'], userId)).rejects.toBeInstanceOf(ConflictException);
      expect(await db.incomeBookEntry.findUnique({ where: { id: entry.id } })).not.toBeNull();
      expect(await db.dailyLogEntry.findUnique({ where: { id: log.id } })).toMatchObject({ stylistProfileId: sourceProfile.id });
      await users.removeStylistRole(source.id, { ...choices, dailyLogs: { mode: 'TRANSFER', targetStylistProfileId: target.id }, previewRevision: preview.revision }, ['OWNER'], userId);
      expect(await db.dailyLogEntry.findUnique({ where: { id: log.id } })).toMatchObject({ stylistProfileId: target.id });
      expect(await db.incomeBookEntry.findUnique({ where: { id: entry.id } })).toMatchObject({ dailyLogEntryId: log.id });
    } finally {
      await db.incomeBook.deleteMany({ where: { id: book.id } });
      await db.user.deleteMany({ where: { id: { in: [source.id, targetUser.id] } } });
    }
  });

  it('rejects a stale preview and preserves newly linked data, then accepts a fresh explicit confirmation', async () => {
    const original = await users.getStylistRemovalPreview(userId, ['OWNER']);
    expect(original.counts.reviewsCount).toBe(0);
    const review = await db.review.create({ data: { userId, serviceId, stylistProfileId: profileId, serviceRating: 5 } });
    await expect(users.removeStylistRole(userId, { ...choices, previewRevision: original.revision }, ['OWNER'], userId)).rejects.toBeInstanceOf(ConflictException);
    expect(await db.review.findUnique({ where: { id: review.id } })).not.toBeNull();
    expect(await db.stylistProfile.findUnique({ where: { id: profileId } })).not.toBeNull();
    const refreshed = await users.getStylistRemovalPreview(userId, ['OWNER']);
    expect(refreshed.counts.reviewsCount).toBe(1);
    const debt = await db.clientDebt.create({ data: { clientId: userId, stylistProfileId: profileId, createdById: userId, amount: 10 } });
    await expect(users.removeStylistRole(userId, { ...choices, previewRevision: refreshed.revision }, ['OWNER'], userId)).rejects.toBeInstanceOf(ConflictException);
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
    await expect(users.removeStylistRole(userId, { ...choices, previewRevision: financialPreview.revision }, ['OWNER'], userId)).rejects.toBeDefined();
    const targetUser = await db.user.create({ data: { username: `target-${randomUUID()}`, firstName: 'Target', lastName: 'Stylist' } });
    const target = await db.stylistProfile.create({ data: { userId: targetUser.id, status: 'ACTIVE' } });
    try {
      await expect(users.removeStylistRole(userId, { ...choices, previewRevision: financialPreview.revision,
        financialTargetStylistProfileId: target.id }, ['OWNER'], userId)).rejects.toBeInstanceOf(BadRequestException);
      await expect(users.removeStylistRole(userId, { ...choices, previewRevision: financialPreview.revision,
        confirmFinancialTransfer: true }, ['OWNER'], userId)).rejects.toBeInstanceOf(BadRequestException);
      await expect(users.removeStylistRole(userId, { ...choices, previewRevision: financialPreview.revision,
        financialTargetStylistProfileId: profileId, confirmFinancialTransfer: true }, ['OWNER'], userId)).rejects.toBeInstanceOf(BadRequestException);
      await db.stylistProfile.update({ where: { id: target.id }, data: { status: 'INACTIVE' } });
      await expect(users.removeStylistRole(userId, { ...choices, previewRevision: financialPreview.revision,
        financialTargetStylistProfileId: target.id, confirmFinancialTransfer: true }, ['OWNER'], userId)).rejects.toBeInstanceOf(BadRequestException);
      await db.stylistProfile.update({ where: { id: target.id }, data: { status: 'ACTIVE' } });
      expect(await db.stylistFinancialTransferAudit.count({ where: { sourceUserId: userId } })).toBe(0);
      expect(await db.clientDebt.findUnique({ where: { id: debt.id } })).toMatchObject({ stylistProfileId: profileId });
      await users.removeStylistRole(userId, { ...choices, previewRevision: financialPreview.revision,
        financialTargetStylistProfileId: target.id, confirmFinancialTransfer: true }, ['OWNER'], userId);
      const audit = await db.stylistFinancialTransferAudit.findFirstOrThrow({ where: { sourceUserId: userId } });
      expect(audit).toMatchObject({ sourceProfileId: profileId, targetProfileId: target.id, targetUserId: targetUser.id, actorUserId: userId });
      expect(audit.debtIds).toEqual(expect.arrayContaining([debt.id, settled.id]));
      expect(audit.manualIncomeIds).toEqual([manual.id]);
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
