import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)
const source = readFileSync(new URL('./pages/stylist-inbox-page.tsx', import.meta.url), 'utf8')
const keys = new Set([...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key))
const hasLocaleKey = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource) !== undefined

test('stylist reservation inbox UI uses keys present in both locales', () => {
  assert.ok(keys.has('stylistPortal.inbox.title'))
  assert.ok(keys.has('stylistPortal.inbox.ownDebtWarning'))
  assert.ok(keys.has('stylistPortal.inbox.loadFailed'))
  assert.ok(keys.has('stylistPortal.inbox.cancellationCount'))
  assert.doesNotMatch(source, /CXL:\\s*\\{/)
  assert.match(source, /count > 0 \? <Badge variant="warning">\{t\('stylistPortal\.inbox\.cancellationCount'/)
  assert.match(source, /new Intl\.NumberFormat\(locale, \{ maximumFractionDigits: 0 \}\)\.format\(count\)/)

  for (const resource of locales) {
    for (const key of keys) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }
})
