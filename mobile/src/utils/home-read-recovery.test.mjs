import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const screen = readFileSync(new URL('../screens/client/HomeScreen.tsx', import.meta.url), 'utf8');
const translations = readFileSync(new URL('../i18n/bs.ts', import.meta.url), 'utf8');

test('home feed runtime-validates core public sections and preserves stale content on failure', () => {
  assert.match(screen, /normalizePublicServiceCategories\(rawCategories\)/);
  assert.match(screen, /normalizePublicServices\(rawServices\)/);
  assert.match(screen, /normalizeHomeBlogPosts\(blogRes\.data\)/);
  assert.match(screen, /if \(!categories \|\| !catalogServices \|\| !blogItems\)/);
  assert.match(screen, /if \(generation === homeRequestGeneration\.current\) setHomeLoadError\(true\)/);
  assert.doesNotMatch(screen, /catch \{\s*setCategoriesWithServices\(\[\]\)|catch \{\s*setBlogPosts\(\[\]\)/);
  assert.match(screen, /homeRequestGeneration\.current \+= 1/);
});

test('optional home debts, reservation, gallery and featured review failures remain visible with retry', () => {
  for (const key of ['debtLoadError', 'reservationLoadError', 'beforeAfterLoadError', 'featuredReviewLoadError']) {
    assert.match(translations, new RegExp(`${key}:`));
    assert.match(screen, new RegExp(`t\\('home\\.${key}'\\)`));
  }
  assert.match(screen, /api\.get<unknown>\('\/api\/client-debts\/me'\)\.catch\(\(\) => null\)/);
  assert.match(screen, /normalizeDebtAmounts\(debtsRes\.data\)/);
  assert.match(screen, /normalizeBeforeAfterPage\(data\)/);
  assert.match(screen, /normalizeFeaturedReview\(data\)/);
  assert.match(screen, /normalizeReservations\(data\)/);
  assert.match(screen, /onPress=\{\(\) => void fetchUpcomingReservation\(\)\}/);
  assert.match(screen, /onPress=\{\(\) => void fetchData\(\)\}/);
});

test('home debt notice uses localized Bosnian title and amount interpolation', () => {
  assert.match(translations, /openDebtTitle: 'Otvoreno dugovanje'/)
  assert.match(translations, /openDebtSummary: 'Otvorena dugovanja: \{\{count\}\} · \{\{amount\}\} KM — pogledajte profil\.'/)
  assert.match(screen, /t\('home\.openDebtTitle'\)/)
  assert.match(screen, /t\('home\.openDebtSummary', \{[\s\S]*?count: openDebtsCount,[\s\S]*?amount: openDebtsTotal\.toFixed\(2\)/)
  assert.doesNotMatch(screen, /Imate otvoreno dugovanje|stavk\(i\)/)
})

test('home clears private debt and reservation data across account identity changes', () => {
  assert.match(screen, /const userId = user\?\.id \?\? null/);
  assert.match(screen, /setOpenDebtsCount\(0\);\s*setOpenDebtsTotal\(0\)/);
  assert.match(screen, /setUpcomingReservation\(null\);\s*setUpcomingReservationLoadError\(false\)/);
  assert.match(screen, /\}, \[userId\]\)/);
});
