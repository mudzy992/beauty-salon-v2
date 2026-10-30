import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const screen = readFileSync(new URL('./ClientReservationDetailScreen.tsx', import.meta.url), 'utf8');
const translations = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8');

test('client reservation detail runtime-validates the response and keeps it bound to route and user', () => {
  assert.match(screen, /api\.get<unknown>\(`\/api\/reservations\/\$\{reservationId\}`\)/);
  assert.match(screen, /normalizeReservationDetail\(data\)/);
  assert.match(screen, /requestGeneration\.current \+= 1/);
  assert.match(screen, /requestIdentity\.current\.userId !== userId/);
  assert.match(screen, /reservationOwner\?\.userId === userId && reservationOwner\.reservationId === reservationId/);
  assert.match(screen, /generation !== requestGeneration\.current/);
  assert.match(screen, /catch \{\s*if \(generation === requestGeneration\.current\) setLoadError\(true\)/);
  assert.doesNotMatch(screen, /catch \{\s*setReservation\(null\)/);
});

test('reservation detail presents distinct retry and stale-data recovery states', () => {
  assert.match(screen, /if \(loading && !visibleReservation\)/);
  assert.match(screen, /reservationDetail\.loadErrorTitle/);
  assert.match(screen, /reservationDetail\.loadErrorMessage/);
  assert.match(screen, /reservationDetail\.staleMessage/);
  assert.match(screen, /actionLabel=\{loadError \? t\('common\.retry'\) : undefined\}/);
  assert.match(screen, /const handleRefresh = useCallback\(async \(\) => \{\s*setRefreshing\(true\);\s*try \{\s*await load\(\);\s*\} finally \{\s*setRefreshing\(false\)/);
  assert.match(screen, /onRefresh=\{\(\) => void handleRefresh\(\)\}/);
  for (const key of ['loadErrorTitle', 'loadErrorMessage', 'staleMessage']) {
    assert.match(translations, new RegExp(`reservationDetail:[\\s\\S]*?${key}:`));
  }
});
