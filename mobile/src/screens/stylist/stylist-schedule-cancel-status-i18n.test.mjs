import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./StylistScheduleScreen.tsx', import.meta.url), 'utf8')
const specialStatusKey = "t('stylist.reservationDetail.cancel.unconfirmedAttendanceStatus')"

test('schedule special cancellation badge reuses the translated status label', () => {
  assert.match(resource, /unconfirmedAttendanceStatus:\s*'Otkazano \(nepotvrđen dolazak\)'/)
  assert.equal(screen.split(specialStatusKey).length - 1, 2)
  assert.doesNotMatch(screen, /\? 'Otkazano \(nepotvrđen dolazak\)'/)
})

test('special cancellation detection and other status fallbacks are unchanged', () => {
  assert.equal((screen.match(/status === 'CANCELLED_BY_CLIENT'/g) ?? []).length, 2)
  assert.equal((screen.match(/'Nije potvrđen dolazak u roku'/g) ?? []).length, 2)
  assert.equal((screen.match(/t\(`myReservations\.status\.\$\{(?:activeReservation|item)\.status\}` as any\)/g) ?? []).length, 2)
  assert.equal((screen.match(/getStatusVariant\((?:activeReservation|item)\.status\)/g) ?? []).length, 2)
})
