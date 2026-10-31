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

const { normalizePublicServices } = loadTypeScriptModule('../utils/apiPayload.ts');
const catalogSource = readFileSync(new URL('./catalog.ts', import.meta.url), 'utf8');
const consumers = [
  ['../screens/stylist/DailyLogNewEntryScreen.tsx', 'stylist daily-log service picker'],
  ['../screens/stylist/use-stylist-direct-booking-form.ts', 'stylist direct-booking service picker'],
];

const publicServiceDto = {
  id: 'service-1',
  subcategoryId: 'subcategory-1',
  name: 'Haircut',
  durationMinutes: 30,
  price: 25,
  gender: 'FEMALE',
  sortOrder: 1,
};

test('shared public service loader validates the active-only backend DTO', () => {
  const normalized = normalizePublicServices([publicServiceDto]);
  assert.equal(normalized?.length, 1);
  assert.equal(normalized?.[0]?.isActive, true);
  assert.equal(normalizePublicServices([{ ...publicServiceDto, isActive: false }]), null);
  assert.equal(normalizePublicServices([{ ...publicServiceDto, price: 'invalid' }]), null);
  assert.match(catalogSource, /fetchAllPublicServices<unknown>\(params\)/);
  assert.match(catalogSource, /normalizePublicServices\(payload\)/);
  assert.match(catalogSource, /if \(!services\) throw new Error/);
});

test('remaining service-catalog consumers use runtime-normalized services, not generic casts', () => {
  for (const [relativePath, label] of consumers) {
    const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
    assert.match(source, /fetchAllNormalizedPublicServices/, `${label} should use the validated loader`);
    assert.doesNotMatch(source, /fetchAllPublicServices<\s*(?:Service|DirectBookingService)\s*>/);
  }

  const hookSource = readFileSync(new URL('../hooks/usePublicServiceCatalog.ts', import.meta.url), 'utf8');
  assert.match(hookSource, /fetchAllNormalizedPublicServices/);
  for (const relativePath of [
    '../screens/client/ReservationScreen.tsx',
    '../screens/client/ReviewsScreen.tsx',
  ]) {
    const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
    assert.match(source, /usePublicServiceCatalog/);
    assert.doesNotMatch(source, /fetchAllPublicServices<\s*Service\s*>/);
  }

  const reservationSource = readFileSync(new URL('../screens/client/ReservationScreen.tsx', import.meta.url), 'utf8');
  assert.match(reservationSource, /api\.get<unknown>\(`\/api\/services\/\$\{initialServiceId\}`\)/);
  assert.match(reservationSource, /normalizePublicServices\(\[data\]\)/);
});
