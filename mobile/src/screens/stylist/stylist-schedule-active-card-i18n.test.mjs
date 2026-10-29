import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./StylistScheduleScreen.tsx', import.meta.url), 'utf8')
const scheduleTranslations = resource.match(/schedule:\s*\{([\s\S]*?)\n\s*\},\n\s*\},\n\};/)?.[1]

test('active reservation card copy uses stylist schedule resources', () => {
  assert.ok(scheduleTranslations, 'Missing stylist schedule resources')
  for (const [key, copy] of [
    ['activeReservationTitle', 'Aktivna rezervacija'],
    ['activeReservationHint', 'Dodirnite karticu za naplatu, završetak i slike.'],
    ['reservationDetails', 'Detalji'],
    ['payment', 'Naplata'],
  ]) {
    assert.ok(scheduleTranslations.includes(`${key}: '${copy}'`), `Missing translation copy: ${key}`)
    assert.ok(screen.includes(`t('stylist.schedule.${key}')`), `Active card missing key: ${key}`)
  }
  assert.doesNotMatch(screen, /Aktivna rezervacija|Dodirnite karticu za naplatu, završetak i slike\.|title="Detalji"|title="Naplata"/)
})

test('active reservation card remains conditional and opens the same detail route', () => {
  assert.match(screen, /ListHeaderComponent=\{\s*activeReservation \?/)
  assert.equal((screen.match(/navigation\.navigate\('StylistReservationDetail'/g) ?? []).length, 4)
  assert.equal((screen.match(/reservationId: activeReservation\.id/g) ?? []).length, 3)
})
