import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)
const source = readFileSync(new URL('./pages/stylist-direct-booking-page.tsx', import.meta.url), 'utf8')
// Ključ se koristi i kao fallback u `resolveAdminApiError(getErrorMessage(err, ''), 'ključ')`:
// serverska poruka se tada prevodi kroz mapu, a ovaj ključ ostaje jedini izvor teksta kad
// backend ne vrati poruku. Bez ove grane sakupljač bi mislio da je ključ ispao iz upotrebe.
const usedKeys = (src) =>
  [
    ...src.matchAll(/\bt\('([^']+)'/g),
    ...src.matchAll(/resolveAdminApiError\(.*, '([^']+)'\)/g),
  ].map(([, key]) => key)
const keys = new Set(usedKeys(source))
const hasLocaleKey = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource) !== undefined

test('stylist direct-booking UI uses keys present in both locales', () => {
  assert.ok(keys.has('stylistPortal.directBooking.title'))
  assert.ok(keys.has('stylistPortal.directBooking.createFailed'))
  assert.ok(keys.has('stylistPortal.directBooking.genderNotDefined'))

  for (const resource of locales) {
    for (const key of keys) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }
})
