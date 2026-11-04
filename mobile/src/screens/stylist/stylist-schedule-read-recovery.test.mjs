import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const screen = readFileSync(new URL('./StylistScheduleScreen.tsx', import.meta.url), 'utf8');
const translations = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8');
const pagination = readFileSync(new URL('../../services/reservation-list.ts', import.meta.url), 'utf8');

test('stylist schedule uses bounded pages and ignores stale profile requests', () => {
  assert.match(screen, /fetchAllReservationPages<unknown>\(\{/);
  assert.match(screen, /asStylist: true[\s\S]*?fromDate,[\s\S]*?toDate,/);
  assert.match(screen, /const rows = normalizeReservations\(data\)/);
  assert.match(screen, /if \(!rows\)/);
  assert.match(screen, /generation !== requestGeneration\.current/);
  assert.match(screen, /requestGeneration\.current \+= 1/);
  assert.match(screen, /requestOwnerId\.current !== profileId/);
  assert.match(screen, /reservationsOwnerId === profileId \? reservations : EMPTY_RESERVATIONS/);
  assert.match(screen, /catch \{\s*if \(generation === requestGeneration\.current\) setLoadError\(true\)/);
  assert.doesNotMatch(screen, /api\.get<unknown>\('\/api\/reservations'/);
});

test('reservation pagination enforces the shared API bounds and rejects oversized pages', () => {
  assert.match(pagination, /const PAGE_SIZE = 50/);
  assert.match(pagination, /const MAX_OFFSET = 1000/);
  assert.match(pagination, /\.items\.length > PAGE_SIZE/);
  assert.match(pagination, /params:\s*\{\s*\.\.\.filters,\s*page,\s*pageSize:\s*PAGE_SIZE\s*\}/);
  assert.match(pagination, /items\.length < total/);
  assert.match(pagination, /Reservation list exceeds the safe loading limit/);
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
