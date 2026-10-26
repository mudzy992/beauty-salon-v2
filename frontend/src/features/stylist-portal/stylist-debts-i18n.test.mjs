import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)
const source = readFileSync(new URL('./pages/stylist-debts-page.tsx', import.meta.url), 'utf8')
const keys = new Set([...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key))
const hasLocaleKey = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource) !== undefined

test('stylist debt UI uses keys present in both locales', () => {
  assert.ok(keys.has('stylistPortal.debts.title'))
  assert.ok(keys.has('stylistPortal.debts.dialogDescription'))
  assert.ok(keys.has('stylistPortal.debts.loadFailed'))

  for (const resource of locales) {
    for (const key of keys) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }
})
