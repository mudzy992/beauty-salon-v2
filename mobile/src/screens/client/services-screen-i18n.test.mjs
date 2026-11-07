import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8');
const screen = readFileSync(new URL('./ServicesScreen.tsx', import.meta.url), 'utf8');
const servicesTranslations = resource.match(/services:\s*\{([\s\S]*?)\n\s*\},\n\s*beforeAfterGallery:/)?.[1];

const keys = [
  'serviceDiscoveryEyebrow',
  'serviceDiscoveryTitle',
  'serviceDiscoveryDescription',
  'popularServiceHeading',
  'lastUsedServiceHeading',
  'lastUsedServiceDescription',
  'repeatLastUsedService',
  'categoryFallbackDescription',
];

test('services discovery screen renders static copy from Bosnian resources', () => {
  assert.ok(servicesTranslations, 'Missing services translation resources');
  for (const key of keys) {
    assert.match(servicesTranslations, new RegExp(`${key}:\\s*'[^']+'`), `Missing services resource: ${key}`);
    assert.ok(screen.includes(`t('services.${key}')`), `Services screen missing translation: ${key}`);
  }
  assert.ok(screen.includes("t('services.categories')"));
  assert.ok(screen.includes("t('services.duration', { minutes: featuredService.durationMinutes })"));
  assert.match(screen, /t\('services\.reservationsCount', \{\s*count: popularService\.reservationsCount,\s*\}\)/);
  assert.ok(servicesTranslations.match(/reservationsCount:\s*'([^']+)'/)?.[1].includes('{{count}}'));
});

test('last-used service action exposes a localized service-specific name and hint', () => {
  assert.ok(servicesTranslations.includes("repeatLastUsedServiceAccessibilityLabel: 'Ponovi uslugu {{service}}'"));
  assert.ok(servicesTranslations.includes("repeatLastUsedServiceHint: 'Otvara detalje usluge prije rezervacije.'"));
  assert.ok(screen.includes("accessibilityLabel={t('services.repeatLastUsedServiceAccessibilityLabel', {"));
  assert.ok(screen.includes('service: lastUsedService.name,'));
  assert.ok(screen.includes("accessibilityHint={t('services.repeatLastUsedServiceHint')}"));
  assert.ok(screen.includes("title={t('services.repeatLastUsedService')}"));
});

test('services screen no longer ships the audited hard-coded promotional and fallback copy', () => {
  for (const copy of [
    'PREMIUM KOLEKCIJA',
    'Odaberi idealnu uslugu',
    'Muškarci i žene kategorije su brzo dostupne ispod, uz preporuke po tvojoj historiji.',
    'Najpopularniji servis',
    'Tvoj zadnji servis',
    'Rezerviši ponovo u samo jednom koraku.',
    'Pogledaj dostupne usluge i rezerviši termin.',
  ]) {
    assert.ok(!screen.includes(copy), `Unexpected hard-coded services copy: ${copy}`);
  }
  assert.doesNotMatch(screen, /title="Ponovi"|>Kategorije<|\} min\s*\{/);
});
