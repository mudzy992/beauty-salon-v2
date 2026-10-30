import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const screen = readFileSync(new URL('./ServicesScreen.tsx', import.meta.url), 'utf8');
const translations = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8');

test('service catalogue keeps loaded data after a failed refresh and exposes retry', () => {
  assert.match(screen, /catch\s*\{\s*setLoadError\(true\);\s*\}/);
  assert.match(screen, /setLoadError\(false\)/);
  assert.doesNotMatch(screen, /catch\s*\{[^}]*setCategories\(\[\]\)/s);
  assert.match(screen, /loadError && categories\.length > 0/);
  assert.match(screen, /services\.staleMessage/);
  assert.match(screen, /onPress=\{\(\) => void fetchData\(\)\}/);
  assert.match(translations, /loadErrorTitle: 'Usluge nisu dostupne'/);
  assert.match(translations, /loadErrorMessage:/);
  assert.match(translations, /staleMessage:/);
});

test('empty catalogue distinguishes an API failure from a successful empty result', () => {
  assert.match(screen, /loadError\s*\?\s*\(\s*<EmptyState/);
  assert.match(screen, /title=\{t\('services\.noServices'\)\}/);
  assert.match(screen, /actionLabel=\{t\('common\.retry'\)\}/);
});
