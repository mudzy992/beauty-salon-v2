import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./HomeScreen.tsx', import.meta.url), 'utf8')

test('upcoming reservation accessibility copy includes its service, date, status, and action', () => {
  assert.match(resources, /upcomingReservationTitle: 'Sljedeći termin'/)
  assert.match(
    resources,
    /upcomingReservationAccessibilityLabel: 'Sljedeći termin: \{\{service\}\}, \{\{date\}\}, \{\{status\}\}\.'/,
  )
  assert.match(resources, /upcomingReservationHint: 'Otvara detalje rezervacije\.'/)
  assert.match(resources, /upcomingReservationServiceFallback: 'Rezervacija'/)
  assert.match(screen, /if \(!upcomingReservation\) return t\('home\.upcomingReservationServiceFallback'\)/)
  assert.match(screen, /return upcomingReservation\.service\?\.name \?\? t\('home\.upcomingReservationServiceFallback'\)/)
  assert.doesNotMatch(screen, /return 'Rezervacija'/)
})
