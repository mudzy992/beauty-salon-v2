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

test('direct-booking form fields and actions use Bosnian resources', () => {
  for (const [key, copy] of [
    ['clientLabel', 'Klijent'],
    ['clientPlaceholder', 'Pretraži klijenta...'],
    ['dateLabel', 'Datum'],
    ['startLabel', 'Početak'],
    ['endLabel', 'Kraj'],
    ['notesLabel', 'Napomena'],
    ['cancel', 'Odustani'],
    ['submit', 'Kreiraj termin'],
  ]) {
    assert.ok(resource.includes(`${key}: '${copy}'`), `Missing direct-booking copy: ${key}`)
    assert.ok(screen.includes(`t('stylist.directBooking.${key}')`), `Form is missing key: ${key}`)
  }
  assert.doesNotMatch(
    screen,
    /label="Klijent"|placeholder="Pretraži klijenta\.\.\."|label="Datum"|label="Početak"|label="Kraj"|label="Napomena"|title="Odustani"|title="Kreiraj termin"/,
  )
})

test('direct-booking navigation and form wiring remain unchanged', () => {
  assert.match(schedule, /navigation\.navigate\('StylistDirectBooking'\)/)
  assert.match(screen, /useStylistDirectBookingForm\(\(\) => navigation\.goBack\(\)\)/)
  assert.match(screen, /onChangeText=\{form\.handleClientSearchChange\}/)
  assert.match(screen, /value=\{form\.reservationDate\}[\s\S]*?onChange=\{form\.setReservationDate\}/)
  assert.match(screen, /value=\{form\.startTime\}[\s\S]*?onChange=\{form\.setStartTime\}/)
  assert.match(screen, /value=\{form\.endTime\}[\s\S]*?onChange=\{form\.setEndTime\}/)
  assert.match(screen, /value=\{form\.clientNotes\}[\s\S]*?onChangeText=\{form\.setClientNotes\}/)
  assert.match(screen, /onPress=\{form\.handleSubmit\}/)
  assert.match(screen, /disabled=\{[\s\S]*?!form\.selectedClient[\s\S]*?!form\.endTime/)
})
