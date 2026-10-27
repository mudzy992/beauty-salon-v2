import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(
    readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8'),
  ),
)
const sources = [
  '../../pages/Dashboard.tsx',
  './finance-stats.tsx',
  './ops-stats.tsx',
  './recent-reservations.tsx',
].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'))
const keys = new Set(
  sources.flatMap((source) => [...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key)),
)
const hasLocaleKey = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource) !== undefined
const getLeafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? getLeafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )

test('admin dashboard uses keys present in both locales', () => {
  assert.ok(keys.has('dashboard.financeThisMonth'))
  assert.ok(keys.has('dashboard.reservationCounts'))
  assert.ok(keys.has('dashboard.noReservations'))

  for (const resource of locales) {
    for (const key of keys) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }
})

test('dashboard dynamic status labels and localized date/number formatting are retained', () => {
  const recentReservationsSource = sources[3]
  assert.match(recentReservationsSource, /t\(`reservations\.statuses\.\$\{r\.status\}`/)
  assert.match(recentReservationsSource, /defaultValue: r\.status/)
  assert.match(recentReservationsSource, /formatDateOnlyLocale/)
  assert.match(sources[1], /formatLocalizedAmount/)
  assert.match(sources[2], /formatLocalizedNumber/)
  assert.doesNotMatch(
    sources.join('\n'),
    /Finansije · ovaj mjesec|Ukupan prihod = od servisa|Nema rezervacija\./,
  )
})

test('dashboard and reservation-status translations have matching BS/EN keys', () => {
  const [bosnian, english] = locales.map((resource) =>
    getLeafPaths(resource.dashboard, 'dashboard').sort(),
  )
  assert.deepEqual(bosnian, english)

  const statuses = [
    'PENDING',
    'STYLIST_REVIEW',
    'CONFIRMED',
    'ATTENDANCE_CONFIRMED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED_BY_CLIENT',
    'CANCELLED_BY_STYLISTS',
    'NO_SHOW',
    'AWAITING_DAILY_LOG',
  ]
  for (const resource of locales) {
    for (const status of statuses) {
      assert.ok(resource.reservations.statuses[status], `Missing reservation status: ${status}`)
    }
  }
})
