import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(
    readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8'),
  ),
)
const sourceFiles = [
  './pages/stylist-reservation-detail-page.tsx',
  './components/reservation-detail-summary.tsx',
  './components/reservation-detail-actions.tsx',
  './hooks/use-reservation-detail-actions.ts',
  './hooks/use-reservation-detail-status.ts',
].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'))
const source = sourceFiles.join('\n')
const keys = new Set([
  ...[...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key),
  ...[...source.matchAll(/\bkey:\s*'([^']+)'/g)].map(([, key]) => key),
])
const hasLocaleKey = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource) !== undefined
const getReservationDetailLeafPaths = (value, prefix = 'stylistPortal.reservationDetail') =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? getReservationDetailLeafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )

test('stylist reservation-detail UI uses keys present in both locales', () => {
  assert.ok(keys.has('stylistPortal.reservationDetail.title'))
  assert.ok(keys.has('stylistPortal.reservationDetail.actionsUnavailable'))
  assert.ok(keys.has('stylistPortal.reservationDetail.earlierAppointmentPending'))
  assert.ok(keys.has('stylistPortal.reservationDetail.paymentWithDebt'))
  assert.ok(keys.has('stylistPortal.reservationDetail.diagnostics.status'))
  assert.ok(keys.has('stylistPortal.reservationDetail.diagnostics.profileId'))
  assert.ok(keys.has('stylistPortal.reservationDetail.diagnostics.notSet'))

  for (const resource of locales) {
    for (const key of keys) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
    for (const status of [
      'PENDING', 'STYLIST_REVIEW', 'CONFIRMED', 'ATTENDANCE_CONFIRMED',
      'IN_PROGRESS', 'COMPLETED', 'CANCELLED_BY_CLIENT',
      'CANCELLED_BY_STYLISTS', 'NO_SHOW', 'AWAITING_DAILY_LOG',
      'CANCELLED_UNCONFIRMED_ATTENDANCE',
    ]) {
      assert.ok(
        hasLocaleKey(resource, `reservations.statuses.${status}`),
        `Missing reservation status translation: ${status}`,
      )
    }
  }
})

test('reservation-detail translations have matching Bosnian and English keys', () => {
  const [bosnian, english] = locales.map((resource) =>
    getReservationDetailLeafPaths(resource.stylistPortal.reservationDetail).sort(),
  )
  assert.deepEqual(bosnian, english)
})

test('reservation-detail diagnostic labels and empty values are localized', () => {
  const actionsSource = sourceFiles[2]
  assert.match(actionsSource, /getReservationStatusTranslationKey\(reservation\.status, reservation\.cancelReason\)/)
  assert.match(actionsSource, /profileId \?\? t\('stylistPortal\.reservationDetail\.diagnostics\.notSet'\)/)
  assert.match(actionsSource, /reservation\.confirmedStylistId \?\? t\('stylistPortal\.reservationDetail\.diagnostics\.notSet'\)/)
  assert.match(actionsSource, /reservation\.confirmedStylist\?\.id \?\? t\('stylistPortal\.reservationDetail\.diagnostics\.notSet'\)/)
  assert.match(actionsSource, /isConfirmedStylist \? t\('common\.yes'\) : t\('common\.no'\)/)
  assert.doesNotMatch(actionsSource, /<span[^>]*>(?:status|profileId|confirmedStylistId|confirmedStylist\.id|isConfirmedStylist):<\/span>/)
  assert.doesNotMatch(actionsSource, /\?\? 'null'/)
})
