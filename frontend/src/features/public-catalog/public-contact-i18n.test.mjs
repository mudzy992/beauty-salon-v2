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

test('public contact UI references keys present in both locales', () => {
  const source = readFileSync(new URL('../../pages/public/PublicContact.tsx', import.meta.url), 'utf8')
  const keys = new Set([...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key))

  assert.ok(keys.has('public.contact.titleFallback'))
  assert.ok(keys.has('public.contact.hoursLoadFailed'))
  assert.ok(keys.has('public.contact.messageSent'))

  for (const resource of locales) {
    for (const key of keys) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }
})
