import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL(`../../i18n/locales/${language}.json`, import.meta.url), 'utf8')),
)
const pageSource = readFileSync(new URL('../../pages/Reservations.tsx', import.meta.url), 'utf8')
const statusSource = readFileSync(new URL('./status.ts', import.meta.url), 'utf8')
const listKeys = [
  'calendar',
  'date',
  'time',
  'client',
  'service',
  'priceLoyalty',
  'stylist',
  'status',
  'actions',
  'details',
  'total',
  'previous',
  'next',
  'unconfirmedStylist',
  'stylistFallback',
  'serviceFallback',
]
const hasLocaleKey = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource) !== undefined

const listMarkup = pageSource.slice(
  pageSource.indexOf('<div className="mb-4 flex flex-wrap items-center justify-between gap-3">'),
  pageSource.indexOf('<Dialog open={open}'),
)

test('admin reservation table and pagination copy has matching BS/EN translations', () => {
  const listMarkupKeys = listKeys.filter(
    (key) => !['unconfirmedStylist', 'stylistFallback', 'serviceFallback'].includes(key),
  )
  for (const key of listKeys) {
    const translationKey = `reservations.adminList.${key}`
    assert.ok(pageSource.includes(translationKey), `Reservation list does not use ${translationKey}`)
    if (listMarkupKeys.includes(key)) {
      assert.ok(listMarkup.includes(translationKey), `List markup does not use ${translationKey}`)
    }
    for (const resource of locales) {
      assert.ok(hasLocaleKey(resource, translationKey), `Missing locale key: ${translationKey}`)
      assert.ok(resource.reservations.adminList[key], `Empty locale value: ${translationKey}`)
    }
  }

  assert.match(pageSource, /aria-label=\{t\('reservations\.adminList\.details'\)\}/)
  assert.match(pageSource, /params\.status = statusFilter/)
  assert.match(pageSource, /onClick=\{\(\) => setPage\(\(p\) => Math\.max\(0, p - 1\)\)\}/)
})

test('reservation-list statuses use locale resources while retaining fallback and values', () => {
  const values = [...statusSource.matchAll(/\{ value: '([^']*)', label: '([^']*)' \}/g)]
    .map(([, value]) => value)
    .filter(Boolean)

  assert.match(pageSource, /const statusKey =/)
  assert.match(pageSource, /: `reservations\.statuses\.\$\{status\}`/)
  assert.match(pageSource, /defaultValue: getReservationStatusLabel\(status, cancelReason\)/)
  assert.match(pageSource, /reservations\.statuses\.CANCELLED_UNCONFIRMED_ATTENDANCE/)

  for (const status of values) {
    for (const resource of locales) {
      assert.ok(hasLocaleKey(resource, `reservations.statuses.${status}`), `Missing status translation: ${status}`)
    }
  }
})
