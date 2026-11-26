import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), `../../i18n/locales/${language}.json`), 'utf8')),
)
const HERE = dirname(fileURLToPath(import.meta.url))
const read = (rel) => readFileSync(resolve(HERE, rel), 'utf8')

// S10 (2026-11-18): stranica je podijeljena na hook + tri komponente, pa se
// ključevi sakupljaju iz **svih** tih fajlova.
// Ključ se koristi i kao fallback u
// `resolveAdminApiError(getErrorMessage(err, ''), 'ključ', getErrorCode(err))`:
// serverska poruka se tada prevodi kroz mapu, a ovaj ključ ostaje jedini izvor teksta kad
// backend ne vrati poruku. Bez ove grane sakupljač bi mislio da je ključ ispao iz upotrebe.
const usedKeys = (src) =>
  [
    ...src.matchAll(/\bt\('([^']+)'/g),
    ...src.matchAll(/resolveAdminApiError\(.*, '([^']+)', getErrorCode\(\w+\)\)/g),
  ].map(([, key]) => key)

const source = [
  read('pages/stylist-direct-booking-page.tsx'),
  read('hooks/useStylistDirectBooking.ts'),
  read('hooks/useStylistDirectBookingCatalog.ts'),
  read('hooks/useStylistDirectBookingSubmission.ts'),
  read('components/direct-booking-client-field.tsx'),
  read('components/direct-booking-services-fieldset.tsx'),
  read('components/direct-booking-schedule-fields.tsx'),
].join('\n')

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
