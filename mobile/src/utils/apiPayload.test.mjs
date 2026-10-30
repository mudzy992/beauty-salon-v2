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
  normalizeBeforeAfterPairs,
  normalizeClientDebts,
  normalizeDailyLogEntries,
  normalizeDebtAmounts,
  normalizeLoyaltyPreview,
  normalizeNotifications,
  normalizeReservations,
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
