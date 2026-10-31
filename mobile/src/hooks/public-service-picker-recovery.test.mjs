import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const hookSource = readFileSync(new URL('./usePublicServiceCatalog.ts', import.meta.url), 'utf8');
const reservationSource = readFileSync(
  new URL('../screens/client/ReservationScreen.tsx', import.meta.url),
  'utf8',
);
const reviewsSource = readFileSync(
  new URL('../screens/client/ReviewsScreen.tsx', import.meta.url),
  'utf8',
);

test('public service catalog hook distinguishes loading, successful empty data and failure while retaining prior data', () => {
  assert.match(hookSource, /fetchAllNormalizedPublicServices\(\{ activeOnly \}\)/);
  assert.match(hookSource, /setServices\(result\)/);
  assert.match(hookSource, /catch \{\s*if \(generation === requestGeneration\.current\) setError\(true\);\s*\}/);
  assert.doesNotMatch(hookSource, /catch \{[^}]*setServices\(\[\]\)/s);
  assert.match(hookSource, /requestGeneration\.current \+= 1/);
  assert.match(hookSource, /retry: load/);
});

test('reservation and review service pickers show retry for failures and an empty state only for successful empty results', () => {
  for (const [source, label] of [
    [reservationSource, 'reservation picker'],
    [reviewsSource, 'review picker'],
  ]) {
    assert.match(source, /usePublicServiceCatalog/, `${label} should use shared recovery state`);
    assert.match(source, /serviceCatalog\.error/);
    assert.match(source, /serviceCatalog\.retry\(\)/);
    assert.match(source, /t\('services\.loadErrorMessage'\)/);
    assert.match(source, /t\('services\.noServices'\)/);
  }
  assert.match(reviewsSource, /usePublicServiceCatalog\(\{ enabled: !serviceId \}\)/);
});
