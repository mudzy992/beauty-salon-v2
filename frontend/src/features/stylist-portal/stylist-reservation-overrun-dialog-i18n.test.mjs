import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(
    readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8'),
  ),
)
const source = readFileSync(
  new URL('./components/overrun-reservation-dialog.tsx', import.meta.url),
  'utf8',
)
const keys = new Set([...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key))
const hasLocaleKey = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource) !== undefined
const getLeafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? getLeafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )

test('stylist overrun dialog uses keys present in both locales', () => {
  assert.ok(keys.has('stylistPortal.reservationDialogs.overrun.title'))
  assert.ok(keys.has('stylistPortal.reservationDialogs.overrun.useShorterBreak'))

  for (const resource of locales) {
    for (const key of keys) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }
})

test('overrun-dialog translations have matching Bosnian and English keys', () => {
  const [bosnian, english] = locales.map((resource) =>
    getLeafPaths(resource.stylistPortal.reservationDialogs.overrun, 'stylistPortal.reservationDialogs.overrun').sort(),
  )
  assert.deepEqual(bosnian, english)
})
