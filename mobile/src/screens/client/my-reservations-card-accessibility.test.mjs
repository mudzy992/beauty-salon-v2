import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./MyReservationsScreen.tsx', import.meta.url), 'utf8')
const reservationCard = screen.match(/<TouchableOpacity[\s\S]*?navigation\.navigate\('ReservationDetail'[\s\S]*?<\/TouchableOpacity>/)?.[0]

test('My Reservations cards expose localized reservation identity and open-details hint', () => {
  assert.match(resources, /reservationCardAccessibilityLabel: 'Rezervacija: \{\{services\}\}\. \{\{date\}\}, \{\{time\}\}\. Status: \{\{status\}\}\.'/)
  assert.match(resources, /reservationCardAccessibilityHint: 'Otvara detalje ove rezervacije\.'/)
  assert.ok(reservationCard, 'Reservation detail card action should exist')
  assert.match(reservationCard, /accessibilityRole="button"/)
  assert.match(reservationCard, /accessibilityLabel=\{t\('myReservations\.reservationCardAccessibilityLabel'/)
  assert.match(reservationCard, /services: services\.map\(\(service\) => service\.name\)\.join\(', '\) \|\| title/)
  assert.match(reservationCard, /date: formatDate\(item\.reservationDate\)/)
  assert.match(reservationCard, /time: `\$\{formatTime\(item\.startTime\)\} - \$\{formatTime\(item\.endTime\)\}`/)
  assert.match(reservationCard, /status: statusLabel/)
  assert.match(reservationCard, /accessibilityHint=\{t\('myReservations\.reservationCardAccessibilityHint'\)\}/)
})
