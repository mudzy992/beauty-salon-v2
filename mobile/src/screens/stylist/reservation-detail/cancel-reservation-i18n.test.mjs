import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../../i18n/bs.ts', import.meta.url), 'utf8')
const actions = readFileSync(
  new URL('./hooks/use-reservation-detail-actions.ts', import.meta.url),
  'utf8',
)
const summary = readFileSync(new URL('./reservation-detail-summary.tsx', import.meta.url), 'utf8')
const statusUtils = readFileSync(new URL('./utils/reservation-detail.ts', import.meta.url), 'utf8')
const cancelTranslations = resource.match(/cancel:\s*\{([\s\S]*?)\n\s*\},\n\s*noShow:/)?.[1]

test('stylist reservation cancellation copy uses the Bosnian translation resources', () => {
  assert.ok(cancelTranslations, 'Missing stylist reservation-detail cancellation resources')
  for (const key of [
    'reasonLabel',
    'reasonRequired',
    'cancelledTitle',
    'cancelledMessage',
    'errorFallback',
    'unconfirmedAttendanceStatus',
  ]) {
    assert.match(cancelTranslations, new RegExp(`\\b${key}:`), `Missing cancellation translation: ${key}`)
  }

  for (const key of ['reasonRequired', 'cancelledTitle', 'cancelledMessage', 'errorFallback']) {
    assert.ok(actions.includes(`t('stylist.reservationDetail.cancel.${key}'`), `Action missing key: ${key}`)
  }
  assert.ok(summary.includes("t('stylist.reservationDetail.cancel.reasonLabel')"))
  assert.ok(statusUtils.includes("t('stylist.reservationDetail.cancel.unconfirmedAttendanceStatus')"))
  assert.doesNotMatch(actions, /'Unesite obrazloženje otkazivanja\.'|'Otkazano'|'Rezervacija je otkazana\.'|'Greška pri otkazivanju\.'/)
  assert.doesNotMatch(summary, /Razlog otkazivanja:/)
  assert.doesNotMatch(statusUtils, /return 'Otkazano \(nepotvrđen dolazak\)'/)
})

test('cancellation keeps reason validation, request payload and navigation behavior', () => {
  assert.match(actions, /const reason = cancelReason\.trim\(\)/)
  assert.match(actions, /if \(!reason\)\s*\{[\s\S]*cancel\.reasonRequired/)
  assert.match(actions, /\/stylist-cancel/)
  assert.match(actions, /\{ cancelReason: reason \}/)
  assert.match(actions, /setCancelModalOpen\(false\)/)
  assert.match(actions, /navigation\.goBack\(\)/)
  assert.match(actions, /setCancelSubmitting\(false\)/)
})
