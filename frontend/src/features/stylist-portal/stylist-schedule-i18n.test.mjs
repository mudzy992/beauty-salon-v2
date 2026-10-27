import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)
const source = readFileSync(new URL('./pages/stylist-schedule-page.tsx', import.meta.url), 'utf8')
const keys = new Set([...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key))
const hasLocaleKey = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource) !== undefined

test('stylist schedule UI uses keys present in both locales', () => {
  assert.ok(keys.has('stylistPortal.schedule.title'))
  assert.ok(keys.has('reservations.statuses.CANCELLED_UNCONFIRMED_ATTENDANCE'))
  assert.ok(keys.has('stylistPortal.schedule.loadFailed'))

  for (const resource of locales) {
    for (const key of keys) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
    assert.ok(hasLocaleKey(resource, 'reservations.statuses.AWAITING_DAILY_LOG'))
  }
})
