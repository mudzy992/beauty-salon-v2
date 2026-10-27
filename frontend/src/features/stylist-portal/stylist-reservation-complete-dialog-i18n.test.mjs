import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(
    readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8'),
  ),
)
const sourceFiles = [
  './components/complete-reservation-dialog.tsx',
  './components/client-debt-selector.tsx',
  './utils/complete-dialog-helpers.ts',
].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'))
const source = sourceFiles.join('\n')
const keys = new Set([
  ...[...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key),
  ...[...source.matchAll(/\bkey:\s*'([^']+)'/g)].map(([, key]) => key),
  ...[...source.matchAll(/return '(stylistPortal\.[^']+)'/g)].map(([, key]) => key),
])
const hasLocaleKey = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource) !== undefined
const getLeafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? getLeafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )

test('stylist completion dialog and debt selector use keys present in both locales', () => {
  assert.ok(keys.has('stylistPortal.reservationDialogs.complete.title'))
  assert.ok(keys.has('stylistPortal.reservationDialogs.complete.debtIntentRequired'))
  assert.ok(keys.has('stylistPortal.reservationDialogs.complete.selectedDebtsTotal'))

  for (const resource of locales) {
    for (const key of keys) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }
})

test('completion-dialog translations have matching Bosnian and English keys', () => {
  const [bosnian, english] = locales.map((resource) =>
    getLeafPaths(resource.stylistPortal.reservationDialogs.complete, 'stylistPortal.reservationDialogs.complete').sort(),
  )
  assert.deepEqual(bosnian, english)
})
