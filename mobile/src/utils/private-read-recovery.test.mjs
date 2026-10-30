import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const reservations = readFileSync(new URL('../screens/client/MyReservationsScreen.tsx', import.meta.url), 'utf8');
const inbox = readFileSync(new URL('../screens/stylist/StylistInboxScreen.tsx', import.meta.url), 'utf8');
const dailyLogDetail = readFileSync(new URL('../screens/stylist/DailyLogDetailScreen.tsx', import.meta.url), 'utf8');
const translations = readFileSync(new URL('../i18n/bs.ts', import.meta.url), 'utf8');

test('private reservation and stylist inbox reads validate payloads and ignore stale requests', () => {
  for (const screen of [reservations, inbox]) {
    assert.match(screen, /api\.get<unknown>\('\/api\/reservations'/);
    assert.match(screen, /const rows = normalizeReservations\(data\)/);
    assert.match(screen, /if \(!rows\) setLoadError\(true\)/);
    assert.match(screen, /generation !== requestGeneration\.current/);
    assert.match(screen, /requestGeneration\.current \+= 1/);
    assert.match(screen, /catch \{\s*if \(generation === requestGeneration\.current\) setLoadError\(true\)/);
    assert.match(screen, /onPress=\{\(\) => void fetchReservations\(\)\}/);
  }
  assert.match(reservations, /const userId = useAuthStore\(\(state\) => state\.user\?\.id \?\? null\)/);
  assert.match(reservations, /reservationsOwnerId === userId \? reservations : \[\]/);
  assert.match(reservations, /requestOwnerId\.current !== userId/);
  assert.match(inbox, /reservationsOwnerId === profileId \? reservations : \[\]/);
  assert.match(inbox, /requestOwnerId\.current !== profileId/);
  assert.match(inbox, /\}, \[profileId\]\)/);
});

test('daily-log detail validates its payload, retains stale entry, and supports retry', () => {
  assert.match(dailyLogDetail, /api\.get<unknown>\(`\/api\/daily-log\/\$\{entryId\}`\)/);
  assert.match(dailyLogDetail, /normalizeDailyLogEntries\(\[data\]\)/);
  assert.match(dailyLogDetail, /entries\.length !== 1/);
  assert.match(dailyLogDetail, /generation !== requestGeneration\.current/);
  assert.match(dailyLogDetail, /requestGeneration\.current \+= 1/);
  assert.match(dailyLogDetail, /requestEntryId\.current !== entryId/);
  assert.match(dailyLogDetail, /if \(loading && !entry\)/);
  assert.match(dailyLogDetail, /setEntry\(entries\[0\]\)/);
  assert.match(dailyLogDetail, /stylist\.dailyLogDetail\.loadErrorTitle/);
  assert.match(dailyLogDetail, /onPress=\{\(\) => void fetchEntry\(\)\}/);
  assert.doesNotMatch(dailyLogDetail, /catch \{\s*setEntry\(null\)/);
});

test('read recovery messages and retry labels use existing Bosnian localization keys', () => {
  for (const key of ['listLoadErrorTitle', 'listLoadErrorMessage', 'staleListMessage']) {
    assert.match(translations, new RegExp(`reservation:[\\s\\S]*?${key}:`));
  }
  for (const key of ['loadErrorTitle', 'loadErrorMessage', 'staleMessage']) {
    assert.match(translations, new RegExp(`inbox:[\\s\\S]*?${key}:`));
  }
  for (const key of ['loadErrorTitle', 'loadErrorMessage']) {
    assert.match(translations, new RegExp(`dailyLogDetail:[\\s\\S]*?${key}:`));
  }
  assert.match(translations, /retry: 'Pokušaj ponovo'/);
});
