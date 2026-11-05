import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/public/PublicServices.tsx', import.meta.url), 'utf8')
const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)
const hasKey = (resource, key) => key.split('.').reduce((value, part) => value?.[part], resource) !== undefined

test('public services list announces loading and separates errors from an empty catalogue', () => {
  assert.match(source, /role="status" aria-live="polite"[\s\S]*?public\.servicesPage\.loading/)
  assert.match(source, /role="alert"[\s\S]*?public\.servicesPage\.loadFailed[\s\S]*?public\.servicesPage\.retry/)
  assert.match(source, /categories\.length === 0[\s\S]*?common\.noData/)
  for (const locale of locales) {
    assert.ok(hasKey(locale, 'public.servicesPage.loading'))
    assert.ok(hasKey(locale, 'public.servicesPage.loadFailed'))
    assert.ok(hasKey(locale, 'public.servicesPage.retry'))
    assert.ok(hasKey(locale, 'common.noData'))
  }
})

test('catalog retries validate all response collections and ignore stale requests', () => {
  assert.match(source, /!Array\.isArray\(categoryList\)[\s\S]*?!Array\.isArray\(subcategoryList\)[\s\S]*?!Array\.isArray\(serviceList\)/)
  assert.match(source, /const requestId = \+\+requestIdRef\.current/)
  assert.equal((source.match(/requestId === requestIdRef\.current/g) ?? []).length, 3)
  assert.match(source, /return \(\) => \{\s*requestIdRef\.current \+= 1/)
  assert.doesNotMatch(source, /setCategories\(\[\]\)/)
})
