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
  assert.match(screen, /requestIdentity\.current\.routeKey !== route\.key/);
  assert.match(screen, /reservationOwner\.routeKey === route\.key/);
  assert.match(screen, /identity\.mounted &&[\s\S]*identity\.generation === identityGeneration/);
  assert.match(screen, /identity\.userId === userId &&[\s\S]*identity\.reservationId === reservationId &&[\s\S]*identity\.routeKey === route\.key/);
  assert.match(screen, /useAuthStore\.getState\(\)\.user\?\.id === userId/);
  assert.match(screen, /if \(useAuthStore\.getState\(\)\.user\?\.id !== userId\) return;\s*const identityGeneration = requestIdentity\.current\.generation;\s*if \(!isCurrentIdentity\(identityGeneration\)\) return;\s*const generation = \+\+requestGeneration\.current/);
  assert.match(screen, /if \(!isCurrentLoad\(\)\) return/);
  assert.match(screen, /if \(!normalized \|\| normalized\.id !== reservationId\)/);
  assert.match(screen, /catch \{\s*if \(isCurrentLoad\(\)\) setLoadError\(true\)/);
  assert.match(screen, /requestIdentity\.current\.mounted = false;[\s\S]*requestIdentity\.current\.generation \+= 1/);
  assert.doesNotMatch(screen, /catch \{\s*setReservation\(null\)/);
});

test('reservation detail presents distinct retry and stale-data recovery states', () => {
  assert.match(screen, /if \(\(loading \|\| \(!!userId && !hasCurrentOwner && !loadError\)\) && !visibleReservation\)/);
  assert.match(screen, /reservationDetail\.loadErrorTitle/);
  assert.match(screen, /reservationDetail\.loadErrorMessage/);
  assert.match(screen, /reservationDetail\.staleMessage/);
  assert.match(screen, /actionLabel=\{loadError \? t\('common\.retry'\) : undefined\}/);
  assert.match(screen, /const handleRefresh = useCallback\(async \(\) => \{\s*const identityGeneration = requestIdentity\.current\.generation;\s*if \(!isCurrentIdentity\(identityGeneration\)\) return;\s*setRefreshing\(true\);\s*try \{\s*await load\(\);\s*\} finally \{\s*if \(isCurrentIdentity\(identityGeneration\)\) setRefreshing\(false\)/);
  assert.match(screen, /const retryLoad = useCallback\(\(\) => \{\s*const identityGeneration = requestIdentity\.current\.generation;\s*if \(!isCurrentIdentity\(identityGeneration\)\) return;\s*setLoading\(true\);\s*void load\(\)/);
  assert.match(screen, /onRefresh=\{\(\) => void handleRefresh\(\)\}/);
  for (const key of ['loadErrorTitle', 'loadErrorMessage', 'staleMessage']) {
    assert.match(translations, new RegExp(`reservationDetail:[\\s\\S]*?${key}:`));
  }
});
