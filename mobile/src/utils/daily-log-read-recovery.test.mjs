import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const screen = readFileSync(new URL('../screens/stylist/DailyLogListScreen.tsx', import.meta.url), 'utf8');
const translations = readFileSync(new URL('../i18n/bs.ts', import.meta.url), 'utf8');

test('daily-log list preserves loaded entries when refresh or payload validation fails', () => {
  assert.match(screen, /const normalizedEntries = normalizeDailyLogEntries\(data\)/);
  assert.match(screen, /if \(!normalizedEntries\) setLoadError\(true\)/);
  assert.match(screen, /catch \{\s*if \(generation === requestGeneration\.current\) setLoadError\(true\)/);
  assert.doesNotMatch(screen, /catch \{\s*setEntries\(\[\]\)/);
});

test('daily-log list ignores stale requests and offers localized retry for empty and stale states', () => {
  assert.match(screen, /generation !== requestGeneration\.current/);
  assert.match(screen, /requestGeneration\.current \+= 1/);
  assert.match(screen, /stylist\.dailyLogList\.staleMessage/);
  assert.match(screen, /stylist\.dailyLogList\.loadErrorMessage/);
  assert.match(screen, /actionLabel=\{t\('common\.retry'\)\}/);
  for (const key of ['loadErrorTitle', 'loadErrorMessage', 'staleMessage']) {
    assert.match(translations, new RegExp(`dailyLogList:[\\s\\S]*?${key}:`));
  }
});
