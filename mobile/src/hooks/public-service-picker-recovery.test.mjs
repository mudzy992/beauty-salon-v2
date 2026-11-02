import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const hookSource = readFileSync(
  new URL('./usePublicServiceCatalog.ts', import.meta.url),
  'utf8',
);
const reservationSource = readFileSync(
  new URL('../screens/client/ReservationScreen.tsx', import.meta.url),
  'utf8',
);

test('public service catalog hook distinguishes loading, successful empty data and failure while retaining prior data', () => {
  assert.match(
    hookSource,
    /fetchAllNormalizedPublicServices\(\{ activeOnly \}\)/,
  );
  assert.match(hookSource, /setServices\(result\)/);
  assert.match(
    hookSource,
    /catch \{\s*if \(generation === requestGeneration\.current\) setError\(true\);\s*\}/,
  );
  assert.doesNotMatch(hookSource, /catch \{[^}]*setServices\(\[\]\)/s);
  assert.match(hookSource, /requestGeneration\.current \+= 1/);
  assert.match(hookSource, /retry: load/);
});

test('reservation service picker shows retry for failures and empty state only for successful empty results', () => {
  assert.match(
    reservationSource,
    /usePublicServiceCatalog/,
    'reservation picker should use shared recovery state',
  );
  assert.match(reservationSource, /serviceCatalog\.error/);
  assert.match(reservationSource, /serviceCatalog\.retry\(\)/);
  assert.match(reservationSource, /t\('services\.loadErrorMessage'\)/);
  assert.match(reservationSource, /t\('services\.noServices'\)/);
});
