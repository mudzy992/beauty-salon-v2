import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./ReservationScreen.tsx', import.meta.url), 'utf8')
const continueButton = screen.match(/<Button\s+title=\{t\(selectedServices\.length > 0 \? 'reservation\.continueToDate' : 'reservation\.selectService'\)\}[\s\S]*?disabled=\{selectedServices\.length === 0\}[\s\S]*?\/>/)?.[0]

test('reservation service-selection continuation is localized and named contextually', () => {
  assert.match(resources, /continueToDate: 'Nastavi na izbor datuma'/)
  assert.match(resources, /selectService: 'Odaberite uslugu'/)
  assert.match(resources, /continueFromServicesHint: 'Izaberite jednu ili više usluga da nastavite na izbor datuma\.'/)
  assert.ok(continueButton, 'Reservation service-selection continuation button should exist')
  assert.match(continueButton, /accessibilityHint=\{t\('reservation\.continueFromServicesHint'\)\}/)
  assert.match(continueButton, /disabled=\{selectedServices\.length === 0\}/)
})
