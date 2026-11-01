import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const screen = readFileSync(new URL('../../../app/stylist/(tabs)/daily-log/debts.tsx', import.meta.url), 'utf8');

test('stylist debt list validates the whole response and preserves rows on read failures', () => {
  assert.match(screen, /normalizeStylistDebtRows\(data\)/);
  assert.match(screen, /if \(!normalizedRows\) throw new Error/);
  assert.match(screen, /catch \{\s*if \(mounted\.current && generation === requestGeneration\.current\) setLoadError\(true\)/);
  assert.doesNotMatch(screen, /setRows\(\[\]\)/);
  assert.match(screen, /setRows\(normalizedRows\)/);
});

test('stylist debt list isolates stale requests and exposes initial-error and stale-data retry states', () => {
  assert.match(screen, /generation !== requestGeneration\.current/);
  assert.match(screen, /requestGeneration\.current \+= 1/);
  assert.match(screen, /loadError && rows\.length === 0/);
  assert.match(screen, /stylist\.dailyLogDebts\.loadErrorMessage/);
  assert.match(screen, /stylist\.dailyLogDebts\.staleMessage/);
  assert.match(screen, /stylist\.dailyLogDebts\.retry/);
});

test('stylist debt repayment uses the shared safe API error parser and localized fallback', () => {
  assert.match(screen, /getApiErrorMessage\(error, t\('stylist\.dailyLogDebts\.repayErrorFallback'\)\)/);
  assert.doesNotMatch(screen, /'response' in err|response\?\.data\?\.message|\bas any\b/);
});
