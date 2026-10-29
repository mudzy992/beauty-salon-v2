import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(
    readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8'),
  ),
)
const sources = [
  './components/cancel-reservation-dialog.tsx',
  './components/no-show-reservation-dialog.tsx',
  './components/reject-reservation-dialog.tsx',
].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'))
const keys = new Set(sources.flatMap((source) =>
  [...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key),
))
const hasLocaleKey = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource) !== undefined
const getLeafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? getLeafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )

test('stylist cancel, reject and no-show dialogs use keys present in both locales', () => {
  assert.ok(keys.has('stylistPortal.reservationDialogs.cancel.title'))
  assert.ok(keys.has('stylistPortal.reservationDialogs.reject.title'))
  assert.ok(keys.has('stylistPortal.reservationDialogs.reject.description'))
  assert.ok(keys.has('stylistPortal.reservationDialogs.reject.reason'))
  assert.ok(keys.has('stylistPortal.reservationDialogs.noShow.penalty'))

  for (const resource of locales) {
    for (const key of keys) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }
})

test('reason-dialog translations have matching Bosnian and English keys', () => {
  const [bosnian, english] = locales.map((resource) =>
    getLeafPaths(resource.stylistPortal.reservationDialogs, 'stylistPortal.reservationDialogs').sort(),
  )
  assert.deepEqual(bosnian, english)
})

test('rejection dialog preserves reason trimming, length limit, busy guard and callbacks', () => {
  const rejectionDialog = sources[2]
  assert.match(rejectionDialog, /reason\.trim\(\)\.slice\(0, 500\)/)
  assert.match(rejectionDialog, /if \(!trimmed\) return/)
  assert.match(rejectionDialog, /await onConfirm\(trimmed\)/)
  assert.match(rejectionDialog, /maxLength=\{500\}/)
  assert.match(rejectionDialog, /disabled=\{pending \|\| reason\.trim\(\)\.length === 0\}/)
  assert.match(rejectionDialog, /if \(!next\) setReason\(''\)/)
})
