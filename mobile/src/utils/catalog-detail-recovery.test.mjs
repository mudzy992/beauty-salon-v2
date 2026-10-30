import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('service catalogue list validates category and service rows while preserving error and retry state', () => {
  const screen = source('../screens/client/ServicesScreen.tsx');
  assert.match(screen, /normalizePublicServiceCategories\(categoriesRes\)/);
  assert.match(screen, /normalizePublicServices\(servicesRes\)/);
  assert.match(screen, /setLoadError\(true\)/);
  assert.match(screen, /onAction=\{\(\) => void fetchData\(\)\}/);
});

test('category detail distinguishes failed fetches from a valid empty category and discards stale responses', () => {
  const screen = source('../screens/client/ServiceDetailScreen.tsx');
  assert.match(screen, /normalizePublicServices\(rawServices\)/);
  assert.match(screen, /generation !== requestGeneration\.current/);
  assert.match(screen, /title=\{loadError \? t\('services\.detailLoadErrorTitle'\) : t\('services\.noServices'\)\}/);
  assert.match(screen, /onAction=\{loadError \? \(\) => void fetchServices\(\) : undefined\}/);
});

test('single-service detail isolates service, review, and gallery failures and exposes retries', () => {
  const screen = source('../screens/client/ServiceSingleDetailScreen.tsx');
  assert.match(screen, /Promise\.allSettled/);
  assert.match(screen, /normalizePublicServices\(\[serviceResult\.value\.data\]\)/);
  assert.match(screen, /normalizePublicReviewPage\(reviewsResult\.value\.data, 0, REVIEW_PAGE_SIZE\)/);
  assert.match(screen, /normalizeBeforeAfterPage\(data\)/);
  assert.match(screen, /serviceLoadError \? \(/);
  assert.match(screen, /reviewsLoadError \? t\('common\.retry'\)/);
  assert.match(screen, /galleryLoadError \? \(/);
  assert.match(screen, /galleryRequestGeneration\.current \+= 1/);
});

test('all service detail recovery copy exists in the Bosnian mobile resources', () => {
  const translations = source('../i18n/bs.ts');
  for (const key of ['detailLoadErrorTitle', 'detailLoadErrorMessage', 'galleryLoadError']) {
    assert.match(translations, new RegExp(`${key}:`));
  }
  assert.match(translations, /loadError: 'Recenzije nisu dostupne/);
});
