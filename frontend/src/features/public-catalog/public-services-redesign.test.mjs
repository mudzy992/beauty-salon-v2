import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/public/PublicServices.tsx', import.meta.url), 'utf8')
const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)
const hasKey = (resource, key) => key.split('.').reduce((value, part) => value?.[part], resource) !== undefined

const copyKeys = [
  'kicker', 'heroNote', 'exploreServices', 'bookAppointment', 'heroFootnote', 'imageBadge',
  'imageCaption', 'imageSubcaption', 'catalogSizeLabel', 'stepDiscoverTitle',
  'stepDiscoverDescription', 'stepChooseTitle', 'stepChooseDescription', 'stepBookTitle',
  'stepBookDescription', 'catalogEyebrow', 'catalogTitle', 'catalogDescription',
  'searchLabel', 'searchPlaceholder', 'clearSearch', 'categoryFilter', 'allCategories',
  'clearFilters', 'emptyCatalog', 'noResultsTitle', 'noResultsDescription', 'viewService',
  'duration', 'ctaEyebrow', 'ctaTitle', 'ctaDescription',
]

test('redesigned services page keeps salon-managed copy, catalogue content, and booking routes', () => {
  assert.match(source, /getSetting\('public_services_title'/)
  assert.match(source, /getSetting\('public_services_subtitle'/)
  assert.match(source, /services-editorial-hero\.jpg/)
  assert.match(source, /href="#service-catalog"/)
  assert.match(source, /Link to="\/rezervacija"/)
  assert.match(source, /to=\{`\/usluge\/\$\{service\.id\}`\}/)
  assert.match(source, /toLocaleLowerCase/)
})

test('catalog search, category filters, result feedback, and reset controls are accessible', () => {
  assert.match(source, /<label htmlFor="public-services-search"/)
  assert.match(source, /id="public-services-search"/)
  assert.match(source, /aria-pressed=\{activeCategoryId === ALL_CATEGORIES\}/)
  assert.match(source, /aria-pressed=\{activeCategoryId === category\.id\}/)
  assert.match(source, /aria-live="polite" aria-atomic="true"/)
  assert.match(source, /aria-label=\{t\('public\.servicesPage\.clearSearch'\)\}/)
  assert.match(source, /onClick=\{clearFilters\}/)
})

test('all new visible and accessible copy exists in both supported locales', () => {
  for (const locale of locales) {
    for (const key of copyKeys) {
      assert.ok(hasKey(locale, `public.servicesPage.${key}`), `Missing locale key: public.servicesPage.${key}`)
    }
    assert.ok(hasKey(locale, 'public.servicesPage.serviceCount_one'))
    assert.ok(hasKey(locale, 'public.servicesPage.serviceCount_other'))
  }
  assert.ok(hasKey(locales[0], 'public.servicesPage.serviceCount_few'))
})
