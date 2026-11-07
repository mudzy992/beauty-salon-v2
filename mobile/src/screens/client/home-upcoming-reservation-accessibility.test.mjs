import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const screen = readFileSync(new URL('./HomeScreen.tsx', import.meta.url), 'utf8')
const upcomingCard = screen.match(/\{upcomingReservation \? \(\s*<Pressable([\s\S]*?)<\/Pressable>/)?.[1]

test('upcoming reservation card is a named button with service, date, status, and a navigation hint', () => {
  assert.ok(upcomingCard, 'Upcoming reservation Pressable should exist')
  assert.match(upcomingCard, /accessibilityRole="button"/)
  assert.match(upcomingCard, /accessibilityLabel=\{t\('home\.upcomingReservationAccessibilityLabel', \{/)
  assert.match(upcomingCard, /service: upcomingServiceName/)
  assert.match(upcomingCard, /date: formatReservationDate\(upcomingReservation\.reservationDate, upcomingReservation\.startTime\)/)
  assert.match(upcomingCard, /status: getStatusLabel\(upcomingReservation\.status\)/)
  assert.match(upcomingCard, /accessibilityHint=\{t\('home\.upcomingReservationHint'\)\}/)
  assert.match(upcomingCard, /params: \{ reservationId: upcomingReservation\.id \}/)
  assert.match(screen, /t\('home\.upcomingReservationTitle'\)/)
})
