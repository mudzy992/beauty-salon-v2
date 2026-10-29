import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./StylistDirectBookingScreen.tsx', import.meta.url), 'utf8')
const schedule = readFileSync(new URL('./StylistScheduleScreen.tsx', import.meta.url), 'utf8')

test('stylist direct-booking title and introduction use Bosnian resources', () => {
  assert.match(resource, /directBooking:\s*\{\s*title:\s*'Direktna rezervacija'/)
  assert.match(resource, /subtitle:\s*'Termin ide direktno u vaš raspored i ne traži attendance potvrdu klijenta\.'/)
  assert.match(screen, /t\('stylist\.directBooking\.title'\)/)
  assert.match(screen, /t\('stylist\.directBooking\.subtitle'\)/)
  assert.match(schedule, /accessibilityLabel=\{t\('stylist\.directBooking\.title'\)\}/)
  assert.doesNotMatch(screen, /<Text[^>]*>Direktna rezervacija<\/Text>|Termin ide direktno u vaš raspored/)
  assert.doesNotMatch(schedule, /accessibilityLabel="Direktna rezervacija"/)
})

test('direct-booking navigation and form wiring remain unchanged', () => {
  assert.match(schedule, /navigation\.navigate\('StylistDirectBooking'\)/)
  assert.match(screen, /useStylistDirectBookingForm\(\(\) => navigation\.goBack\(\)\)/)
  assert.match(screen, /onChangeText=\{form\.handleClientSearchChange\}/)
  assert.match(screen, /onPress=\{form\.handleSubmit\}/)
})
