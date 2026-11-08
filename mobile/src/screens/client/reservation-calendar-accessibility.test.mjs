import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./ReservationScreen.tsx', import.meta.url), 'utf8')
const calendarLocale = screen.match(/LocaleConfig\.locales\.bs = \{([\s\S]*?)\n\};/)?.[1]

test('reservation calendar uses Bosnian labels, a Monday-first week, and announces date availability', () => {
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
  assert.ok(calendarLocale, 'Bosnian calendar locale should be registered')
  assert.match(calendarLocale, /monthNames:\s*\[[\s\S]*?'januar'[\s\S]*?'decembar'/)
  assert.match(calendarLocale, /dayNames:\s*\[[\s\S]*?'nedjelja'[\s\S]*?'subota'/)
  assert.match(calendarLocale, /today: 'Danas'/)
  assert.match(calendarLocale, /formatAccessibilityLabel: 'dddd d MMMM yyyy'/)
  assert.match(screen, /LocaleConfig\.defaultLocale = 'bs'/)
  assert.match(screen, /<Calendar\s+firstDay=\{1\}/)
})
