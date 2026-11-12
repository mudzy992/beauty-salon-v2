import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/public/PublicServices.tsx', import.meta.url), 'utf8')
const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)
const hasKey = (resource, key) => key.split('.').reduce((value, part) => value?.[part], resource) !== undefined

const copyKeys = [
  'loading', 'loadFailed', 'retry', 'exploreServices', 'bookAppointment',
  'searchLabel', 'searchPlaceholder', 'clearSearch', 'categoryFilter', 'allCategories',
  'clearFilters', 'emptyCatalog', 'noResultsTitle', 'noResultsDescription', 'viewService',
  'duration',
]

test('services editorial content, salon identity and contacts are supplied by admin/public salon settings', () => {
  const settings = [
    'title', 'subtitle', 'hero_note', 'hero_explore_cta', 'hero_book_cta', 'hero_footnote',
    'image_badge', 'image_caption', 'image_subcaption', 'catalog_size_label',
    'catalog_eyebrow', 'catalog_heading', 'catalog_description', 'cta_eyebrow', 'cta_heading', 'cta_description', 'cta_button',
  ]
  for (const key of settings) assert.ok(source.includes(`editorial('${key}')`), `Missing admin copy setting ${key}`)
  assert.match(source, /editorial\(`step_\$\{number\}_title`\)/)
  assert.match(source, /editorial\(`step_\$\{number\}_description`\)/)
  assert.match(source, /api\.get<PublicSalonIdentity \| null>\('\/api\/salon'\)/)
  assert.match(source, /public_contact_address/)
  assert.match(source, /public_contact_phone/)
  assert.match(source, /public_contact_email/)
  assert.doesNotMatch(source, /services-editorial-hero\.jpg|Beauty Salon Nejra|Sarajevo/)
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

test('services content uses the shell main landmark and names links with all visible text', () => {
  assert.match(source, /<div data-aurum-page="services"/)
  assert.doesNotMatch(source, /<main\b/)
  assert.match(source, /aria-label=\{labelWithVisibleText\(t\('public\.servicesPage\.viewService'[\s\S]*?public\.servicesPage\.duration/)
  assert.match(source, /aria-label=\{t\('public\.servicesPage\.clearSearch'\)\}[\s\S]*?h-11 w-11/)
})
