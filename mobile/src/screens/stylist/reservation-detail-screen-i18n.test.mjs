import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./StylistReservationDetailScreen.tsx', import.meta.url), 'utf8')

test('stylist reservation detail not-found copy uses translations', () => {
  assert.match(resource, /notFound:\s*'Rezervacija nije pronađena\.'/)
  assert.match(screen, /t\('stylist\.reservationDetail\.notFound'\)/)
  assert.match(resource, /back:\s*'Nazad'/)
  assert.match(screen, /title=\{t\('common\.back'\)\}/)
  assert.doesNotMatch(screen, /Rezervacija nije pronađena\.|title="Nazad"/)
})

test('reservation not-found state and back navigation are unchanged', () => {
  assert.match(screen, /if \(!reservation\) \{/)
  assert.match(screen, /onPress=\{\(\) => navigation\.goBack\(\)\}/)
  assert.match(screen, /variant="outline"/)
})
