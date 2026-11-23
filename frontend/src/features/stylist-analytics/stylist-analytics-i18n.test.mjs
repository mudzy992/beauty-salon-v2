import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(
    readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8'),
  ),
)
const source = readFileSync(new URL('../../pages/StylistAnalytics.tsx', import.meta.url), 'utf8')
const tables = readFileSync(new URL('./stylist-analytics-tables.tsx', import.meta.url), 'utf8')
const hook = readFileSync(new URL('./use-stylist-analytics-data.ts', import.meta.url), 'utf8')
assert.match(source, /useStylistAnalyticsData\(\{ stylistId, appliedFrom, appliedTo \}\)/)
assert.match(source, /<StylistAnalyticsTables data=\{data\} formatDate=\{formatDate\}/)
const keys = new Set([source, tables].flatMap((text) => [...text.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key)))
const hasLocaleKey = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource) !== undefined
const getLeafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? getLeafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )

test('stylist analytics UI uses keys present in both locales', () => {
  assert.ok(keys.has('stylistAnalytics.backToStylists'))
  assert.ok(keys.has('stylistAnalytics.period'))
  assert.ok(keys.has('stylistAnalytics.topServices'))

  for (const resource of locales) {
    for (const key of keys) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }
})

test('stylist analytics keeps API data dynamic and formats dates, numbers, and amounts by locale', () => {
  assert.match(hook, /`\/api\/stylists\/\$\{encodeURIComponent\(stylistId\)\}\/analytics`/)
  assert.match(source, /params\.fromDate = dateFrom/)
  assert.match(source, /params\.toDate = dateTo/)
  assert.match(source, /data\.stylist\.name/)
  assert.match(tables, /s\.serviceName/)
  assert.match(tables, /e\.clientName \?\? '-'/)
  assert.match(source, /formatDateOnlyLocale/)
  assert.match(tables, /formatLocalizedAmount\(Number\(e\.actualPrice\), i18n\.language\)/)
  assert.match(tables, /formatLocalizedNumber\(s\.count, i18n\.language\)/)
  assert.doesNotMatch(
    source + tables,
    /Nazad na Stiliste|Odaberite stilistu \(npr\. s liste Stilisti\)|Nije moguće učitati analitiku stiliste\.|Primijeni period|Top usluge|Nema podataka\./,
  )
})

test('stylist analytics translations have matching Bosnian and English keys', () => {
  const [bosnian, english] = locales.map((resource) =>
    getLeafPaths(resource.stylistAnalytics, 'stylistAnalytics').sort(),
  )
  assert.deepEqual(bosnian, english)
})
