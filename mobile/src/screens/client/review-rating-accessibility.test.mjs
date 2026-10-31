import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const screen = readFileSync(new URL('./ReviewsScreen.tsx', import.meta.url), 'utf8');
const translations = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8');

test('review stars expose radio semantics, contextual labels and selected state', () => {
  assert.match(screen, /accessibilityRole="radio"/);
  assert.match(screen, /accessibilityLabel=\{t\('reviews\.ratingOption', \{ category, rating: star, total: 5 \}\)\}/);
  assert.match(screen, /accessibilityHint=\{t\('reviews\.ratingSelectionHint'\)\}/);
  assert.match(screen, /accessibilityState=\{\{ selected: rating === star \}\}/);
  assert.match(screen, /category=\{t\('reviews\.serviceRating'\)\}/);
  assert.match(screen, /category=\{t\('reviews\.stylistRating'\)\}/);
  assert.match(screen, /onPress=\{\(\) => onRate\(star\)\}/);
});

test('review rating text and required-rating error have localized resources', () => {
  for (const key of ['ratingOption', 'ratingSelectionHint', 'rateServiceRequired']) {
    assert.match(translations, new RegExp(`reviews:[\\s\\S]*?${key}:`));
  }
});
