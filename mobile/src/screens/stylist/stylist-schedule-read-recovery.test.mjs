import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const screen = readFileSync(new URL('./StylistScheduleScreen.tsx', import.meta.url), 'utf8');
const translations = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8');

test('stylist schedule validates reservation data and ignores stale profile requests', () => {
  assert.match(screen, /api\.get<unknown>\('\/api\/reservations'/);
  assert.match(screen, /const rows = normalizeReservations\(data\)/);
  assert.match(screen, /if \(!rows\)/);
  assert.match(screen, /generation !== requestGeneration\.current/);
  assert.match(screen, /requestGeneration\.current \+= 1/);
  assert.match(screen, /requestOwnerId\.current !== profileId/);
  assert.match(screen, /reservationsOwnerId === profileId \? reservations : EMPTY_RESERVATIONS/);
  assert.match(screen, /catch \{\s*if \(generation === requestGeneration\.current\) setLoadError\(true\)/);
  assert.doesNotMatch(screen, /catch \{\s*setReservations\(\[\]\)/);
});

test('schedule distinguishes initial errors from stale data and offers retry without dropping content', () => {
  assert.match(screen, /stylist\.schedule\.loadErrorTitle/);
  assert.match(screen, /stylist\.schedule\.loadErrorMessage/);
  assert.match(screen, /stylist\.schedule\.staleMessage/);
  assert.match(screen, /onAction=\{\(\) => void fetchReservations\(\)\}/);
  assert.match(screen, /await refreshReservations\(\);\s*\} finally \{\s*setRefreshing\(false\)/);
  assert.match(screen, /sections: Section\[\] = useMemo/);
  for (const key of ['loadErrorTitle', 'loadErrorMessage', 'staleMessage']) {
    assert.match(translations, new RegExp(`schedule:[\\s\\S]*?${key}:`));
  }
});
