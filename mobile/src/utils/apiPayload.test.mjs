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
  normalizeDailyLogEntries,
  normalizeDebtAmounts,
  normalizeLoyaltyPreview,
  normalizeNotifications,
  normalizePublicReviewPage,
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

test('before-after parser filters incomplete nested media rows and normalizes usable paths', () => {
  const rows = normalizeBeforeAfterPairs([
    {
      id: 'pair-1',
      before: { pathMedium: 'private/before.webp' },
      after: { pathOriginal: 'private/after.webp', pathThumb: null },
    },
    { id: 'pair-2', before: null, after: { pathOriginal: 'private/after.jpg' } },
    { id: 'pair-3', before: { pathOriginal: 'private/before.jpg' }, after: {} },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].before.pathOriginal, 'private/before.webp');
  assert.equal(normalizeBeforeAfterPairs({ items: [] }), null);
});

test('before-after page parser requires a coherent pagination envelope', () => {
  const page = normalizeBeforeAfterPage({ items: [], hasMore: false, nextOffset: 0 });
  assert.deepEqual(page, { items: [], hasMore: false, nextOffset: 0 });
  assert.equal(normalizeBeforeAfterPage({ items: [], hasMore: 'false', nextOffset: 0 }), null);
  assert.equal(normalizeBeforeAfterPage({ items: [], hasMore: false, nextOffset: -1 }), null);
});

test('stylist client-search parser validates the paged envelope and filters malformed users', () => {
  const clients = normalizeClientSearchResults({ items: [
    { id: 'u-1', username: 'amina', firstName: null, lastName: 'K.', gender: 'FEMALE' },
    { id: 'bad', username: 5, firstName: null, lastName: null },
  ] });
  assert.deepEqual(clients, [{ id: 'u-1', username: 'amina', firstName: null, lastName: 'K.', gender: 'FEMALE' }]);
  assert.equal(normalizeClientSearchResults({}), null);
});

test('public service parsers validate catalogue rows and keep valid entries from partial payloads', () => {
  const service = {
    id: 's-1', subcategoryId: 'sub-1', name: 'Šišanje', durationMinutes: 30,
    price: 25, gender: 'FEMALE', isActive: true, sortOrder: 0,
    subcategory: { id: 'sub-1', categoryId: 'cat-1', name: 'Njega' },
  };
  assert.equal(normalizePublicServices([service, { ...service, id: null }]).length, 1);
  assert.equal(normalizePublicServices([{ id: 'invalid' }]), null);
  assert.equal(normalizePublicServices([]).length, 0);
  assert.equal(normalizePublicServiceCategories([{ id: 'cat-1', name: 'Žene', sortOrder: 0, isActive: true }]).length, 1);
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

test('public review page parser validates pagination and filters malformed reviews', () => {
  const page = normalizePublicReviewPage({
    items: [
      { id: 'rev-1', serviceRating: 5, createdAt: '2026-10-30T10:00:00Z', comment: 'Odlično', user: { firstName: 'Amina', lastName: 'K.' } },
      { id: 'rev-bad', serviceRating: 9, createdAt: 'today' },
    ],
    total: 1, hasMore: false, nextOffset: 1,
  }, 0, 20);
  assert.equal(page.items.length, 1);
  assert.equal(page.items[0].user.firstName, 'Amina');
  assert.equal(normalizePublicReviewPage({ items: [], total: -1 }, 0, 20), null);
  assert.equal(normalizePublicReviewPage('invalid', 0, 20), null);
});

test('catalog pagination helper throws rather than masking malformed envelopes as empty catalogues', () => {
  const catalogSource = readFileSync(new URL('../services/catalog.ts', import.meta.url), 'utf8');
  assert.match(catalogSource, /throw new Error\('Invalid service catalogue page'\)/);
  assert.match(catalogSource, /Invalid service catalogue pagination metadata/);
});

test('reservation and daily-log parsers reject malformed envelopes and filter unsafe rows', () => {
  assert.deepEqual(normalizeReservations([reservation, null, { id: 'bad' }]).map((row) => row.id), ['r-1']);
  assert.equal(normalizeReservations({ data: [reservation] }), null);
  assert.equal(normalizeReservations([{ ...reservation, items: [null] }]).length, 0);

  const dailyLog = {
    id: 'entry-1', date: '2026-10-30', status: 'COMPLETED',
    actualPrice: 25, tipAmount: 0, items: [], debtPaymentEntries: [],
  };
  assert.equal(normalizeDailyLogEntries([dailyLog, null]).length, 1);
  assert.equal(normalizeDailyLogEntries([{ ...dailyLog, actualPrice: 'not-money' }]).length, 0);
  assert.equal(normalizeDailyLogEntries({ items: [dailyLog] }), null);
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
