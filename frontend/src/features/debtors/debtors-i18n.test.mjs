import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(
    readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8'),
  ),
)
const source = readFileSync(new URL('../../pages/Debtors.tsx', import.meta.url), 'utf8')
const keys = new Set([...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key))
const hasLocaleKey = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource) !== undefined
const getLeafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? getLeafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )

test('admin debtors UI uses keys present in both locales', () => {
  assert.ok(keys.has('debtors.title'))
  assert.ok(keys.has('debtors.reservationReference'))
  assert.ok(keys.has('debtors.manualEntryReference'))

  for (const resource of locales) {
    for (const key of keys) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }
})

test('debt totals, dates, references, and existing API query remain dynamic', () => {
  assert.match(source, /formatLocalizedAmount\(Number\(d\.amount\), i18n\.language\)/)
  assert.match(source, /formatDateOnlyLocale/)
  assert.match(source, /queryKey: \['debts', 'all', 'OPEN'\]/)
  assert.match(source, /status: 'OPEN'/)
  assert.match(source, /d\.service\?\.name/)
  assert.doesNotMatch(
    source,
    /Sva otvorena dugovanja u sistemu|Nema otvorenih dugovanja\.|Klijent, stilist, servis, kod…|Stilist:/,
  )
})

test('debtors translations have matching Bosnian and English keys', () => {
  const [bosnian, english] = locales.map((resource) =>
    getLeafPaths(resource.debtors, 'debtors').sort(),
  )
  assert.deepEqual(bosnian, english)
})
