import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./ReservationScreen.tsx', import.meta.url), 'utf8')

test('reservation calendar announces availability and selected dates in Bosnian', () => {
  assert.match(resources, /availableDateAccessibilityLabel: 'Dostupno za rezervaciju\.'/)
  assert.match(resources, /selectedAvailableDateAccessibilityLabel: 'Odabrano, dostupno za rezervaciju\.'/)
  assert.match(resources, /unavailableDateAccessibilityLabel: 'Nije dostupno za rezervaciju\.'/)

  assert.match(
    screen,
    /accessibilityLabel: t\(\s*isSelected\s*\? 'reservation\.selectedAvailableDateAccessibilityLabel'\s*: 'reservation\.availableDateAccessibilityLabel',?\s*\)/,
  )
  assert.match(
    screen,
    /accessibilityLabel: t\('reservation\.unavailableDateAccessibilityLabel'\),\s*disabled: true,\s*disableTouchEvent: true/,
  )
  assert.match(screen, /if \(selectedDate && availableDates\[selectedDate\] && marks\[selectedDate\]\)/)
  assert.match(screen, /markedDates=\{markedDates\}/)
})
