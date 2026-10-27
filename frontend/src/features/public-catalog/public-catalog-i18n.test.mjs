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

test('public service catalogue, detail, and not-found UI keys exist in both locales', () => {
  const uiSources = [
    new URL('../../pages/public/PublicServices.tsx', import.meta.url),
    new URL('../../pages/public/PublicServiceDetail.tsx', import.meta.url),
    new URL('../../pages/NotFound.tsx', import.meta.url),
  ]
  const keys = new Set()

  for (const sourcePath of uiSources) {
    const source = readFileSync(sourcePath, 'utf8')
    for (const [, key] of source.matchAll(/\bt\('([^']+)'/g)) keys.add(key)
  }

  assert.ok(keys.has('public.servicesPage.loadFailed'))
  assert.ok(keys.has('public.serviceDetail.galleryLoadFailed'))
  assert.ok(keys.has('common.pageNotFound'))

  for (const resource of locales) {
    for (const key of keys) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }
})
