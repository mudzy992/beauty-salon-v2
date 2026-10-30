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

const { normalizeAvailableDates, normalizeAvailableSlots } = loadTypeScriptModule('./reservation-availability.ts');
const { getApiErrorMessage } = loadTypeScriptModule('../../utils/apiError.ts');
const screenSource = readFileSync(new URL('./ReservationScreen.tsx', import.meta.url), 'utf8');
const controllerSource = readFileSync(
  new URL('../../../../backend/src/reservations/reservations.controller.ts', import.meta.url),
  'utf8',
);
const availabilityTypesSource = readFileSync(
  new URL('../../../../backend/src/reservations/availability.types.ts', import.meta.url),
  'utf8',
);
const createDtoSource = readFileSync(
  new URL('../../../../backend/src/reservations/dto/create-reservation.dto.ts', import.meta.url),
  'utf8',
);
const localeSource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8');

test('availability date parser accepts the backend DTO and rejects malformed envelopes/rows', () => {
  assert.deepEqual(
    normalizeAvailableDates([
      { date: '2026-10-30', available: true },
      { date: '2026-10-31', available: false },
    ]),
    { '2026-10-30': true, '2026-10-31': false },
  );
  assert.equal(normalizeAvailableDates(null), null);
  assert.equal(normalizeAvailableDates({ items: [{ date: '2026-10-30', available: true }] }), null);
  assert.equal(normalizeAvailableDates([{ date: '2026-02-30', available: true }]), null);
  assert.equal(normalizeAvailableDates([{ date: '2026-10-30', available: 'true' }]), null);
});

test('slot parser validates times/count/hold state and filters inconsistent unavailable rows', () => {
  assert.deepEqual(
    normalizeAvailableSlots([
      { startTime: '09:00', endTime: '10:00', availableStylistCount: 2, holdState: 'none' },
      { startTime: '10:00', endTime: '11:00', availableStylistCount: 0, holdState: 'pending_hold' },
      { startTime: '11:00', endTime: '12:00', availableStylistCount: 0, holdState: 'none' },
    ]),
    [
      { startTime: '09:00', endTime: '10:00', availableStylistCount: 2, holdState: 'none' },
      { startTime: '10:00', endTime: '11:00', availableStylistCount: 0, holdState: 'pending_hold' },
    ],
  );
  assert.equal(normalizeAvailableSlots({ slots: [] }), null);
  assert.equal(normalizeAvailableSlots([{ startTime: '25:00', endTime: '26:00', availableStylistCount: 1 }]), null);
  assert.equal(normalizeAvailableSlots([{ startTime: '09:00', endTime: '10:00', availableStylistCount: -1 }]), null);
  assert.equal(normalizeAvailableSlots([{ startTime: '09:00', endTime: '10:00', availableStylistCount: 1, holdState: 'expired' }]), null);
});

test('mobile availability requests and booking payload match backend route and DTO contracts', () => {
  assert.match(controllerSource, /@Controller\('api\/reservations'\)[\s\S]*?@UseGuards\(JwtAuthGuard\)/);
  assert.match(controllerSource, /@Get\('availability\/dates'\)[\s\S]*?@Query\('serviceIds'\) serviceIds[\s\S]*?@Query\('fromDate'\) fromDate[\s\S]*?@Query\('toDate'\)/);
  assert.match(controllerSource, /@Get\('availability\/slots'\)[\s\S]*?@Query\('serviceIds'\) serviceIds[\s\S]*?@Query\('date'\) date/);
  assert.match(availabilityTypesSource, /interface AvailableDateDto\s*\{\s*date: string;[^\n]*\n\s*available: boolean;/);
  assert.match(availabilityTypesSource, /interface AvailableSlotDto\s*\{\s*startTime: string;\s*endTime: string;\s*availableStylistCount: number;\s*holdState\?: 'none' \| 'pending_hold';/);
  assert.match(createDtoSource, /serviceIds\?: string\[\]/);
  assert.match(createDtoSource, /reservationDate!: string/);
  assert.match(createDtoSource, /desiredLoyaltyPercent\?: number/);
  assert.match(createDtoSource, /payDebtsIntent\?: boolean/);
  assert.match(screenSource, /params: \{ serviceIds: selectedServiceIds\.join\(','\), fromDate, toDate \}/);
  assert.match(screenSource, /params: \{ serviceIds: selectedServiceIds\.join\(','\), date \}/);
  assert.match(screenSource, /headers: \{ 'Idempotency-Key': idempotencyKey \}/);
  assert.match(screenSource, /t\('reservation\.availabilityError'\)/);
  assert.match(localeSource, /availabilityError:/);
});

test('reservation submit errors safely handle network, malformed and array server messages', () => {
  assert.equal(getApiErrorMessage(null, 'Fallback'), 'Fallback');
  assert.equal(getApiErrorMessage(new Error('offline'), 'Fallback'), 'Fallback');
  assert.equal(
    getApiErrorMessage({ response: { data: { message: ['Termin nije dostupan.', 'Odaberite drugi termin.'] } } }, 'Fallback'),
    'Termin nije dostupan.\nOdaberite drugi termin.',
  );
  assert.match(screenSource, /getApiErrorMessage\(error, t\('reservation\.submitError'\)\)/);
  assert.match(screenSource, /finally \{\s*setSubmitting\(false\)/);
  assert.match(localeSource, /submitError:/);
});

test('stale availability responses cannot replace current service/date state and failures show retry', () => {
  assert.match(screenSource, /const requestId = \+\+datesRequestIdRef\.current/);
  assert.match(screenSource, /requestId !== datesRequestIdRef\.current/);
  assert.match(screenSource, /requestId === datesRequestIdRef\.current\) setDatesLoading\(false\)/);
  assert.match(screenSource, /const requestId = \+\+slotsRequestIdRef\.current/);
  assert.match(screenSource, /requestId !== slotsRequestIdRef\.current/);
  assert.match(screenSource, /requestId === slotsRequestIdRef\.current\) setSlotsLoading\(false\)/);
  assert.match(screenSource, /datesError[\s\S]*?loadAvailableDates\(\)/);
  assert.match(screenSource, /slotsError[\s\S]*?loadSlotsForDate\(selectedDate \?\? ''\)/);
  assert.match(screenSource, /setAvailableDates\(\{\}\);[\s\S]*?setDatesError\(true\)/);
  assert.match(screenSource, /setSlots\(\[\]\);[\s\S]*?setSlotsError\(true\)/);
});
