import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/prisma/prisma.service';
import { IncomeBookRepository } from '../src/finance/repositories/income-book.repository';
import { IncomeBooksService } from '../src/finance/income-books.service';
import { IncomeManualEntriesService } from '../src/finance/income-manual-entries.service';

function disposableDatabaseUrl(): string {
  const url = new URL(process.env.E2E_DATABASE_URL ?? '');
  const name = decodeURIComponent(url.pathname.slice(1));
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
      !['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname) ||
      !/(^|[_-])(test|e2e|ci)([_-]|$)/i.test(name)) {
    throw new Error('A disposable local test PostgreSQL database is required');
  }
  return url.toString();
}

describe('historical manual income (real PostgreSQL)', () => {
  let db: PrismaService;
  let repo: IncomeBookRepository;
  let manual: IncomeManualEntriesService;
  let userId: string, profileId: string, categoryId: string, serviceId: string, bookId: string;
  const year = 1987, month = 11, date = '1987-11-10';

  beforeAll(async () => {
    db = new PrismaService(new ConfigService({ DATABASE_URL: disposableDatabaseUrl(), DATABASE_PROVIDER: 'postgres' }));
    await db.$connect();
    repo = new IncomeBookRepository(db);
    const books = new IncomeBooksService(repo);
    manual = new IncomeManualEntriesService(db, repo, books);
    const user = await db.user.create({ data: { username: `finance-${randomUUID()}`, firstName: 'Finance', lastName: 'Fixture' } });
    userId = user.id;
    profileId = (await db.stylistProfile.create({ data: { userId, status: 'ACTIVE' } })).id;
    categoryId = (await db.serviceCategory.create({ data: { name: 'Finance fixture' } })).id;
    const subcategory = await db.serviceSubcategory.create({ data: { categoryId, name: 'Finance fixture' } });
    serviceId = (await db.service.create({ data: { subcategoryId: subcategory.id, name: 'Finance fixture', durationMinutes: 30, price: 100 } })).id;
    bookId = (await db.incomeBook.create({ data: { year, month } })).id;
    await db.stylistService.create({ data: { stylistProfileId: profileId, serviceId } });
  });

  afterAll(async () => {
    if (!db) return;
    if (bookId) await db.incomeBook.deleteMany({ where: { id: bookId } });
    if (userId) await db.user.deleteMany({ where: { id: userId } });
    if (categoryId) await db.serviceCategory.deleteMany({ where: { id: categoryId } });
    await db.$disconnect();
  });

  it('retains a settled debt and its separate payment when an unsupported original entry is deleted', async () => {
    const original = await db.incomeBookManualEntry.create({ data: {
      bookId, date: new Date(`${date}T00:00:00Z`), serviceId, stylistProfileId: profileId,
      clientId: userId, createdById: userId, amount: 60,
    } });
    const debt = await db.clientDebt.create({ data: {
      clientId: userId, stylistProfileId: profileId, serviceId, manualEntryId: original.id,
      amount: 40, status: 'SETTLED', settledAt: new Date(), settledById: userId, createdById: userId,
    } });
    const payment = await db.dailyLogEntry.create({ data: {
      stylistProfileId: profileId, serviceId, clientId: userId, debtId: debt.id,
      kind: 'DEBT_PAYMENT', date: new Date(`${date}T00:00:00Z`), actualPrice: 40, publicReferenceCode: randomUUID(),
    } });
    const paymentEntry = await db.incomeBookManualEntry.create({ data: {
      bookId, date: new Date(`${date}T00:00:00Z`), serviceId, stylistProfileId: profileId,
      clientId: userId, createdById: userId, amount: 40, dailyLogEntryId: payment.id,
    } });
    try {
      await db.stylistService.deleteMany({ where: { stylistProfileId: profileId, serviceId } });
      await expect(manual.remove(bookId, original.id, userId)).resolves.toEqual({ deleted: true });
      expect(await db.clientDebt.findUniqueOrThrow({ where: { id: debt.id } })).toMatchObject({ status: 'SETTLED', manualEntryId: null });
      expect(await db.dailyLogEntry.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({ debtId: debt.id });
      expect(await db.incomeBookManualEntry.findUnique({ where: { id: paymentEntry.id } })).not.toBeNull();
      expect(Number((await db.incomeBook.findUniqueOrThrow({ where: { id: bookId } })).totalRevenue)).toBe(40);
      const audit = await db.incomeBookManualEntryAudit.findFirstOrThrow({ where: { bookId, action: 'DELETE' }, orderBy: { createdAt: 'desc' } });
      expect(audit.beforeJson).toMatchObject({ id: original.id, retainedSettledDebtIds: [debt.id] });
    } finally {
      await db.incomeBookManualEntry.deleteMany({ where: { id: { in: [original.id, paymentEntry.id] } } });
      await db.dailyLogEntry.deleteMany({ where: { id: payment.id } });
      await db.clientDebt.deleteMany({ where: { id: debt.id } });
      await db.stylistService.upsert({ where: { stylistProfileId_serviceId: { stylistProfileId: profileId, serviceId } }, create: { stylistProfileId: profileId, serviceId }, update: {} });
    }
  });

  it('rejects an edit that waits for a concurrently removed stylist assignment', async () => {
    await db.stylistService.upsert({ where: { stylistProfileId_serviceId: { stylistProfileId: profileId, serviceId } }, create: { stylistProfileId: profileId, serviceId }, update: {} });
    const entry = await manual.create(bookId, { date, serviceId, stylistProfileId: profileId, paidAmount: 100 }, userId);
    let release!: () => void;
    let signalDeleted!: () => void;
    const deleted = new Promise<void>(resolve => { signalDeleted = resolve; });
    const gate = new Promise<void>(resolve => { release = resolve; });
    const removal = db.$transaction(async tx => {
      await tx.stylistService.delete({ where: { stylistProfileId_serviceId: { stylistProfileId: profileId, serviceId } } });
      signalDeleted();
      await gate;
    }, { timeout: 15_000 });
    let result: Promise<unknown> | undefined;
    try {
      await deleted;
      result = manual.update(bookId, entry.id, { paidAmount: 50 }, userId).then(() => null, error => error);
      const deadline = Date.now() + 8_000;
      let blocked = false;
      while (Date.now() < deadline && !blocked) {
        const rows = await db.$queryRaw<Array<{ count: number }>>`SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%stylist_services%'`;
        blocked = rows[0].count > 0;
        if (!blocked) await new Promise(resolve => setTimeout(resolve, 25));
      }
      expect(blocked).toBe(true);
      release();
      await removal;
      expect(await result).toBeInstanceOf(ConflictException);
      expect(Number((await db.incomeBookManualEntry.findUniqueOrThrow({ where: { id: entry.id } })).amount)).toBe(100);
      expect(await db.incomeBookManualEntryAudit.count({ where: { manualEntryId: entry.id, action: 'UPDATE' } })).toBe(0);
    } finally {
      release();
      await removal.catch(() => undefined);
      if (result) await result;
      await db.incomeBookManualEntry.deleteMany({ where: { id: entry.id } });
      await db.stylistService.upsert({ where: { stylistProfileId_serviceId: { stylistProfileId: profileId, serviceId } }, create: { stylistProfileId: profileId, serviceId }, update: {} });
    }
  });

  it('enforces original eligibility, lock and delete while keeping audit and totals', async () => {
    const entry = await manual.create(bookId, { date, serviceId, stylistProfileId: profileId, paidAmount: 110 }, userId);
    expect(Number(entry.amount)).toBe(100);
    expect(Number(entry.tipAmount)).toBe(10);
    expect((await repo.findDetail(bookId))?.manualEntries[0]?.canEditOriginalService).toBe(true);

    await db.stylistService.deleteMany({ where: { stylistProfileId: profileId, serviceId } });
    expect((await repo.findDetail(bookId))?.manualEntries[0]?.canEditOriginalService).toBe(false);
    await expect(manual.update(bookId, entry.id, { paidAmount: 50 }, userId)).rejects.toBeInstanceOf(ConflictException);
    expect(Number((await db.incomeBookManualEntry.findUniqueOrThrow({ where: { id: entry.id } })).amount)).toBe(100);
    expect(await db.incomeBookManualEntryAudit.count({ where: { bookId, action: 'UPDATE' } })).toBe(0);

    await db.incomeBook.update({ where: { id: bookId }, data: { closedAt: new Date() } });
    await expect(manual.remove(bookId, entry.id, userId)).rejects.toBeInstanceOf(BadRequestException);
    expect(await db.incomeBookManualEntry.findUnique({ where: { id: entry.id } })).not.toBeNull();
    await db.incomeBook.update({ where: { id: bookId }, data: { closedAt: null } });
    await expect(manual.remove(bookId, entry.id, userId)).resolves.toEqual({ deleted: true });
    expect(await db.incomeBookManualEntry.findUnique({ where: { id: entry.id } })).toBeNull();
    const book = await db.incomeBook.findUniqueOrThrow({ where: { id: bookId } });
    expect(Number(book.totalRevenue)).toBe(0);
    expect(Number(book.totalTips)).toBe(0);
    const deletions = await db.incomeBookManualEntryAudit.findMany({ where: { bookId, action: 'DELETE' } });
    expect(deletions.filter(audit => (audit.beforeJson as { id?: string } | null)?.id === entry.id)).toHaveLength(1);
  });
});
