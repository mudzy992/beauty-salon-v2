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

test('upcoming reservation status labels reuse every existing localized reservation status', () => {
  const statuses = [
    'PENDING',
    'STYLIST_REVIEW',
    'CONFIRMED',
    'ATTENDANCE_CONFIRMED',
    'IN_PROGRESS',
    'AWAITING_DAILY_LOG',
    'COMPLETED',
    'CANCELLED_BY_CLIENT',
    'CANCELLED_BY_STYLISTS',
    'NO_SHOW',
  ]

  for (const status of statuses) {
    assert.match(resources, new RegExp(`status: \\{[\\s\\S]*?${status}:`))
    assert.ok(screen.includes(`${status}: 'reservations.status.${status}'`), `Missing translation key for ${status}`)
  }
  assert.match(screen, /return t\(RESERVATION_STATUS_TRANSLATION_KEYS\[status\]\)/)
  assert.doesNotMatch(screen, /PENDING: 'Na čekanju'/)
})
