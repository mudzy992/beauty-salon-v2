import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(
    readFileSync(new URL(`../../i18n/locales/${language}.json`, import.meta.url), 'utf8'),
  ),
)

const hasLocaleKey = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource) !== undefined

test('public home, before-and-after, and service-work UI keys exist in both locales', () => {
  const uiSources = [
    new URL('../../components/BeforeAfterSlider.tsx', import.meta.url),
    new URL('../../features/shell/public/before-after-spotlight.tsx', import.meta.url),
    new URL('../../pages/public/PublicHome.tsx', import.meta.url),
    new URL('../../pages/public/PublicSatisfiedClients.tsx', import.meta.url),
    new URL('../../pages/public/PublicGallery.tsx', import.meta.url),
    new URL('../../pages/ServiceWorkGallery.tsx', import.meta.url),
  ]
  const keys = new Set()

  for (const sourcePath of uiSources) {
    const source = readFileSync(sourcePath, 'utf8')
    for (const [, key] of source.matchAll(/\bt\('([^']+)'/g)) keys.add(key)
  }

  assert.ok(keys.has('public.home.heroTitleFallback'))
  assert.ok(keys.has('public.home.featuredReviewLoadFailed'))
  assert.ok(keys.has('public.beforeAfter.sliderLabel'))
  assert.ok(keys.has('public.home.beforeAfterLoadFailed'))
  assert.ok(keys.has('public.satisfiedClients.loadFailed'))
  assert.ok(keys.has('public.gallery.categoryLoadFailed'))
  assert.ok(keys.has('admin.serviceWorkGallery.pairsLoadFailed'))

  for (const resource of locales) {
    for (const key of keys) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }
})
