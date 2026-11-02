import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadTypeScriptModule(relativePath) {
  const filename = new URL(relativePath, import.meta.url);
  const source = readFileSync(filename, 'utf8');
  const { outputText, diagnostics } = ts.transpileModule(source, {
    fileName: fileURLToPath(filename),
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    reportDiagnostics: true,
  });
  assert.deepEqual(
    (diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error),
    [],
    `${relativePath} should transpile without TypeScript diagnostics`,
  );
  const loadedModule = { exports: {} };
  new Function('module', 'exports', outputText)(loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

const payloads = loadTypeScriptModule('./apiPayload.ts');
const {
  normalizeAvailabilityChangedPayload,
  normalizeBlogCommentPage,
  normalizeBlogPage,
  normalizeBlogPost,
  normalizeBlogPosts,
  normalizeBeforeAfterPage,
  normalizeBeforeAfterPairs,
  normalizeClientDebts,
  normalizeClientSearchResults,
  normalizeDailyLogClients,
  normalizeDailyLogEditorEntry,
  normalizeDailyLogEntries,
  parseCreatedDailyLogEntryId,
  normalizeDebtAmounts,
  normalizeLoyaltyPreview,
  normalizeNotifications,
  normalizePublicReviewPage,
  normalizeSalonWorkingHours,
  normalizePublicServiceCategories,
  normalizePublicServices,
  normalizeReservations,
  normalizeReservationDetail,
  normalizeStylistDebtRows,
  sumDebtAmounts,
} = payloads;

const reservation = {
  id: 'r-1',
  reservationDate: '2026-10-30T00:00:00.000Z',
  startTime: '09:00',
  endTime: '10:00',
  status: 'CONFIRMED',
};

test('debt preview parser accepts decimal strings and rejects malformed rows/envelopes', () => {
  const rows = normalizeDebtAmounts([{ amount: '10.25' }, { amount: 2 }]);
  assert.deepEqual(rows, [{ amount: 10.25 }, { amount: 2 }]);
  assert.equal(sumDebtAmounts(rows), 12.25);
  assert.equal(normalizeDebtAmounts({ items: [] }), null);
  assert.equal(normalizeDebtAmounts([null]), null);
  assert.equal(normalizeDebtAmounts([{ amount: 'not-money' }]), null);
  assert.equal(normalizeDebtAmounts([{ amount: -1 }]), null);
});

test('loyalty preview parser guards nested numbers while preserving optional backend fields', () => {
  const valid = {
    enabled: true,
    hasAccount: true,
    redeemEnabled: true,
    points: 250,
    tier: 'Gold',
    service: {
      id: 'service-1',
      price: 80,
      maxDiscountPercent: 15,
      maxDiscountAmount: '12.00',
      maxUsablePoints: 120,
    },
  };
  assert.equal(normalizeLoyaltyPreview(valid).service.maxDiscountAmount, 12);
  assert.equal(normalizeLoyaltyPreview({ enabled: false, hasAccount: false }).service, undefined);
  assert.equal(normalizeLoyaltyPreview(null), null);
  assert.equal(normalizeLoyaltyPreview({ ...valid, service: { ...valid.service, maxDiscountAmount: 'NaN' } }), null);
  assert.equal(normalizeLoyaltyPreview({ ...valid, service: { ...valid.service, maxDiscountPercent: 101 } }), null);
});

test('salon working-hours parser validates the envelope, clock values, and unique weekdays', () => {
  const row = { dayOfWeek: 1, isWorkingDay: true, openTime: '09:00', closeTime: '17:30' };
  assert.deepEqual(normalizeSalonWorkingHours({ workingHours: [row] }), [row]);
  assert.deepEqual(normalizeSalonWorkingHours(null), []);
  assert.deepEqual(normalizeSalonWorkingHours({ workingHours: [] }), []);
  assert.equal(normalizeSalonWorkingHours([]), null);
  assert.equal(normalizeSalonWorkingHours({}), null);
  assert.equal(normalizeSalonWorkingHours({ workingHours: [null] }), null);
  assert.equal(normalizeSalonWorkingHours({ workingHours: [row, row] }), null);
  assert.equal(normalizeSalonWorkingHours({ workingHours: [{ ...row, dayOfWeek: 7 }] }), null);
  assert.equal(normalizeSalonWorkingHours({ workingHours: [{ ...row, isWorkingDay: 'false' }] }), null);
  assert.equal(normalizeSalonWorkingHours({ workingHours: [{ ...row, openTime: '24:00' }] }), null);
  assert.equal(normalizeSalonWorkingHours({ workingHours: [{ ...row, closeTime: '12:60' }] }), null);
});

test('notification parser rejects malformed envelope, entries and primitive fields', () => {
  const valid = {
    id: 'n-1', userId: 'u-1', title: 'Termin', body: 'Potvrđen',
    type: 'reservation_confirmed', channel: 'PUSH', isRead: false,
    sentAt: '2026-10-30T08:00:00.000Z', data: { reservationId: 'r-1' },
  };
  assert.equal(normalizeNotifications([valid]).length, 1);
  assert.equal(normalizeNotifications({ items: [valid] }), null);
  assert.equal(normalizeNotifications([null]), null);
  assert.equal(normalizeNotifications([{ ...valid, isRead: 'false' }]), null);
  assert.equal(normalizeNotifications([{ ...valid, sentAt: 'not-a-date' }]), null);
});

test('before-after parser rejects partial malformed pages and normalizes complete rows', () => {
  const pair = {
    id: 'pair-1',
    before: { pathMedium: 'private/before.webp' },
    after: { pathOriginal: 'private/after.webp', pathThumb: null },
  };
  const rows = normalizeBeforeAfterPairs([pair]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].before.pathOriginal, 'private/before.webp');
  assert.equal(normalizeBeforeAfterPairs([pair, { id: 'pair-2', before: null, after: {} }]), null);
  assert.equal(normalizeBeforeAfterPairs([]).length, 0);
  assert.equal(normalizeBeforeAfterPairs({ items: [] }), null);
});

test('before-after page parser requires a coherent pagination envelope', () => {
  const page = normalizeBeforeAfterPage({ items: [], hasMore: false, nextOffset: 0 });
  assert.deepEqual(page, { items: [], hasMore: false, nextOffset: 0 });
  assert.equal(normalizeBeforeAfterPage({ items: [], hasMore: 'false', nextOffset: 0 }), null);
  assert.equal(normalizeBeforeAfterPage({ items: [], hasMore: false, nextOffset: -1 }), null);
});

test('stylist client-search parser validates the paged envelope and every returned user', () => {
  const client = { id: 'u-1', username: 'amina', firstName: null, lastName: 'K.', gender: 'FEMALE' };
  assert.deepEqual(normalizeClientSearchResults({ items: [client] }), [client]);
  assert.equal(normalizeClientSearchResults({ items: [client, { id: 'bad', username: 5, firstName: null, lastName: null }] }), null);
  assert.equal(normalizeClientSearchResults({ items: [] }).length, 0);
  assert.equal(normalizeClientSearchResults({}), null);
});

test('public service parser matches the active-only API DTO and rejects malformed rows', () => {
  const service = {
    id: 's-1', subcategoryId: 'sub-1', name: 'Šišanje', durationMinutes: 30,
    price: 25, gender: 'FEMALE', isActive: true, sortOrder: 0,
    subcategory: { id: 'sub-1', categoryId: 'cat-1', name: 'Njega' },
  };
  assert.equal(normalizePublicServices([service, { ...service, id: null }]), null);
  const publicServiceDto = { ...service, subcategory: {
    id: 'sub-1', categoryId: 'cat-1', name: 'Njega', category: { id: 'cat-1', name: 'Žene' },
  } };
  delete publicServiceDto.isActive;
  assert.deepEqual(normalizePublicServices([publicServiceDto]), [{ ...publicServiceDto, isActive: true }]);
  assert.equal(normalizePublicServices([{ ...service, isActive: false }]), null);
  assert.equal(normalizePublicServices([{ ...service, isActive: 'true' }]), null);
  assert.equal(normalizePublicServices([{ id: 'invalid' }]), null);
  assert.equal(normalizePublicServices([]).length, 0);
  const category = { id: 'cat-1', name: 'Žene', sortOrder: 0, isActive: true };
  assert.deepEqual(normalizePublicServiceCategories([category]), [category]);
  assert.equal(normalizePublicServiceCategories([category, null]), null);
  assert.equal(normalizePublicServiceCategories([]).length, 0);
  assert.equal(normalizePublicServiceCategories({ items: [] }), null);
});

test('blog page parser validates public post fields and coherent legacy/paged responses', () => {
  const post = {
    id: 'post-1', title: 'Savjeti', slug: 'savjeti', excerpt: 'Kratak opis',
    heroImage: null, isPublished: true, publishedAt: '2026-10-30T10:00:00.000Z',
    createdAt: '2026-10-29T10:00:00.000Z',
  };
  assert.equal(normalizeBlogPosts([post, { ...post, id: null }]), null);
  assert.equal(normalizeBlogPosts([{ ...post, title: 5 }]), null);
  assert.deepEqual(normalizeBlogPost(post), post);
  assert.equal(normalizeBlogPost({ ...post, content: 5 }), null);
  assert.deepEqual(normalizeBlogPage([post], 20, 0), {
    items: [post], total: 1, limit: 20, offset: 0, hasMore: false, nextOffset: 1,
  });
  assert.deepEqual(normalizeBlogPage({
    items: [post], total: 2, limit: 20, offset: 0, hasMore: true, nextOffset: 1,
  }, 20, 0), {
    items: [post], total: 2, limit: 20, offset: 0, hasMore: true, nextOffset: 1,
  });
  assert.equal(normalizeBlogPage({
    items: [post], total: 2, limit: 20, offset: 0, hasMore: true, nextOffset: 2,
  }, 20, 0), null);
  assert.equal(normalizeBlogPage({ items: [], total: 0 }, 20, 0), null);
});

test('blog comments parser validates legacy and paginated entries and rejects malformed data', () => {
  const comment = {
    id: 'comment-1', content: 'Odličan tekst', createdAt: '2026-10-30T10:00:00.000Z',
    user: { firstName: 'Amina', lastName: 'K.' },
  };
  assert.deepEqual(normalizeBlogCommentPage([comment], 20, 0), {
    items: [comment], total: 1, limit: 20, offset: 0, hasMore: false, nextOffset: 1,
  });
  assert.deepEqual(normalizeBlogCommentPage({
    items: [comment], total: 2, limit: 20, offset: 0, hasMore: true, nextOffset: 1,
  }, 20, 0), {
    items: [comment], total: 2, limit: 20, offset: 0, hasMore: true, nextOffset: 1,
  });
  assert.equal(normalizeBlogCommentPage([{ ...comment, user: null }], 20, 0), null);
  assert.equal(normalizeBlogCommentPage({
    items: [comment], total: 2, limit: 20, offset: 0, hasMore: true, nextOffset: 2,
  }, 20, 0), null);
});

test('public review page parser validates pagination and rejects partial malformed pages', () => {
  const review = { id: 'rev-1', serviceRating: 5, createdAt: '2026-10-30T10:00:00Z', comment: 'Odlično', user: { firstName: 'Amina', lastName: 'K.' } };
  const page = normalizePublicReviewPage({
    items: [review], total: 2, limit: 20, offset: 0, hasMore: true, nextOffset: 1,
  }, 0, 20);
  assert.equal(page.items.length, 1);
  assert.equal(page.items[0].user.firstName, 'Amina');
  assert.equal(normalizePublicReviewPage({
    items: [review, { id: 'rev-bad', serviceRating: 9, createdAt: 'today' }],
    total: 2, limit: 20, offset: 0, hasMore: false, nextOffset: 2,
  }, 0, 20), null);
  assert.equal(normalizePublicReviewPage({ items: [], total: -1 }, 0, 20), null);
  assert.equal(normalizePublicReviewPage('invalid', 0, 20), null);
});

test('catalog pagination fails rather than silently returning incomplete or malformed catalogues', () => {
  const catalogSource = readFileSync(new URL('../services/catalog.ts', import.meta.url), 'utf8');
  const paginationSource = readFileSync(new URL('../services/catalog-pagination.ts', import.meta.url), 'utf8');
  assert.match(catalogSource, /normalizeCatalogPageEnvelope/);
  assert.match(catalogSource, /throw new Error\('Invalid service catalogue page'\)/);
  assert.match(catalogSource, /throw new Error\('Service catalogue pagination exceeded the supported page limit'\)/);
  assert.match(paginationSource, /items\.length > requestedPageSize/);
  assert.match(paginationSource, /nextOffset >= \(total as number\)/);
});

test('reservation and daily-log parsers reject partial malformed lists instead of implying empty results', () => {
  assert.deepEqual(normalizeReservations([reservation]), [reservation]);
  assert.equal(normalizeReservations([]).length, 0);
  assert.equal(normalizeReservations([reservation, null]), null);
  assert.equal(normalizeReservations({ data: [reservation] }), null);
  assert.equal(normalizeReservations([{ ...reservation, items: [null] }]), null);

  const dailyLog = {
    id: 'entry-1', date: '2026-10-30', status: 'COMPLETED',
    actualPrice: 25, tipAmount: 0, items: [], debtPaymentEntries: [],
  };
  assert.deepEqual(normalizeDailyLogEntries([dailyLog]), [dailyLog]);
  assert.equal(normalizeDailyLogEntries([]).length, 0);
  assert.equal(normalizeDailyLogEntries([dailyLog, null]), null);
  assert.equal(normalizeDailyLogEntries([{ ...dailyLog, actualPrice: 'not-money' }]), null);
  assert.equal(normalizeDailyLogEntries({ items: [dailyLog] }), null);
});

test('created daily-log entry ID parser accepts only non-empty string IDs', () => {
  assert.equal(parseCreatedDailyLogEntryId({ id: ' entry-1 ' }), 'entry-1');
  assert.equal(parseCreatedDailyLogEntryId(null), null);
  assert.equal(parseCreatedDailyLogEntryId([]), null);
  assert.equal(parseCreatedDailyLogEntryId({ id: 12 }), null);
  assert.equal(parseCreatedDailyLogEntryId({ id: ' ' }), null);
});

test('daily-log client picker parser validates every client row and gender value', () => {
  const clients = [
    { id: 'client-1', username: 'amina', firstName: 'Amina', lastName: null, gender: 'FEMALE' },
    { id: 'client-2', username: 'user2', firstName: null, lastName: 'Kovač', gender: null },
  ];
  assert.deepEqual(normalizeDailyLogClients(clients), clients);
  assert.deepEqual(normalizeDailyLogClients([]), []);
  assert.equal(normalizeDailyLogClients({ items: clients }), null);
  assert.equal(normalizeDailyLogClients([{ ...clients[0], gender: 'OTHER' }]), null);
  assert.equal(normalizeDailyLogClients([{ ...clients[0], username: null }]), null);
});

test('daily-log editor parser validates route identity, dates, prices and nested rows', () => {
  const payload = {
    id: 'entry-1',
    status: 'PENDING',
    date: '2026-10-30T00:00:00.000Z',
    notes: null,
    actualPrice: '15.50',
    clientId: 'client-1',
    client: { id: 'client-1' },
    serviceId: 'service-1',
    items: [{ serviceId: 'service-1', unitPrice: '15.50' }],
    debtPaymentEntries: [{ actualPrice: '3.25' }],
  };
  const normalized = normalizeDailyLogEditorEntry(payload, 'entry-1');
  assert.equal(normalized.actualPrice, 15.5);
  assert.equal(normalized.items[0].unitPrice, 15.5);
  assert.equal(normalized.debtPaymentEntries[0].actualPrice, 3.25);
  assert.equal(normalizeDailyLogEditorEntry(payload, 'another-entry'), null);
  assert.equal(normalizeDailyLogEditorEntry({ ...payload, date: 'not-a-date' }, 'entry-1'), null);
  assert.equal(normalizeDailyLogEditorEntry({ ...payload, status: 'UNKNOWN' }, 'entry-1'), null);
  assert.equal(normalizeDailyLogEditorEntry({ ...payload, items: [{ serviceId: '' }] }, 'entry-1'), null);
  assert.equal(normalizeDailyLogEditorEntry({ ...payload, debtPaymentEntries: [{ actualPrice: -1 }] }, 'entry-1'), null);
});

test('reservation detail parser validates the reservation and payment amounts consumed by the detail screen', () => {
  const paymentSummary = {
    publicReferenceCode: 'PAY-100', actualPrice: 30, tipAmount: 2,
    serviceAmount: 28, completedAt: '2026-10-30T10:00:00.000Z',
    loyaltyDiscountAmount: 0, items: [{ name: 'Šišanje', unitPrice: 28 }],
  };
  assert.deepEqual(normalizeReservationDetail({ ...reservation, paymentSummary }).paymentSummary, paymentSummary);
  assert.equal(normalizeReservationDetail({ ...reservation, paymentSummary: null }).paymentSummary, null);
  assert.equal(normalizeReservationDetail({ ...reservation, paymentSummary: { ...paymentSummary, actualPrice: 'bad' } }), null);
  assert.equal(normalizeReservationDetail({ ...reservation, paymentSummary: { ...paymentSummary, items: [{ name: 'Šišanje', unitPrice: Infinity }] } }), null);
  assert.equal(normalizeReservationDetail({ ...reservation, status: 'UNKNOWN' }), null);
  assert.equal(normalizeReservationDetail(null), null);
});

test('client debt parser validates required identity, date, status and numeric amount', () => {
  const debt = {
    id: 'debt-1', clientId: 'client-1', stylistProfileId: 'stylist-1',
    createdById: 'user-1', createdAt: '2026-10-30T08:00:00.000Z',
    status: 'OPEN', amount: '12.50', service: { id: 'service-1', name: 'Šišanje' },
  };
  assert.equal(normalizeClientDebts([debt])[0].amount, 12.5);
  assert.equal(normalizeClientDebts([{ ...debt, amount: 'invalid' }]), null);
  assert.equal(normalizeClientDebts([{ ...debt, createdAt: 'invalid-date' }]), null);
});

test('stylist debt list parser validates nested client and date fields consumed by the screen', () => {
  const row = {
    id: 'debt-2', clientId: 'client-1', stylistProfileId: 'stylist-1',
    createdById: 'user-1', createdAt: '2026-10-30T08:00:00.000Z',
    status: 'OPEN', amount: '7.25',
    client: { id: 'client-1', username: 'amina', firstName: null, lastName: 'K.' },
    reservation: { id: 'reservation-1', publicReferenceCode: 'ABC123' },
    dailyLogEntry: null, manualEntry: null,
  };
  assert.equal(normalizeStylistDebtRows([row])[0].client.username, 'amina');
  assert.equal(normalizeStylistDebtRows([{ ...row, client: null }]), null);
  assert.equal(normalizeStylistDebtRows([{ ...row, dailyLogEntry: { id: 'log-1', date: 'bad' } }]), null);
});

test('availability socket payload parser safely ignores invalid wire values', () => {
  assert.deepEqual(normalizeAvailabilityChangedPayload({ serviceIds: ['s-1'], date: '2026-10-30' }), {
    serviceIds: ['s-1'], date: '2026-10-30',
  });
  for (const invalid of [null, 'bad', [], { serviceIds: [null] }, { serviceId: 4 }, { date: 'not-a-date', serviceId: 's-1' }]) {
    assert.equal(normalizeAvailabilityChangedPayload(invalid), null);
  }
});

test('runtime parsers are wired into booking, notification, list, gallery and socket readers', () => {
  const sources = [
    ['../screens/client/ReservationScreen.tsx', /normalizeLoyaltyPreview\(data\)/],
    ['../screens/client/ReservationScreen.tsx', /normalizeDebtAmounts\(data\)/],
    ['../screens/client/HomeScreen.tsx', /normalizeReservations\(data\)/],
    ['../store/notificationStore.ts', /normalizeNotifications\(data\)/],
    ['../screens/stylist/DailyLogListScreen.tsx', /normalizeDailyLogEntries\(data\)/],
    ['../screens/stylist/StylistInboxScreen.tsx', /normalizeReservations\(data\)/],
    ['../../app/stylist/(tabs)/daily-log/debts.tsx', /normalizeStylistDebtRows\(data\)/],
    ['../hooks/useAvailabilitySocketRefresh.ts', /normalizeAvailabilityChangedPayload\(data\)/],
  ];
  for (const [path, pattern] of sources) {
    assert.match(readFileSync(new URL(path, import.meta.url), 'utf8'), pattern, path);
  }
});
