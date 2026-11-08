import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./ReservationScreen.tsx', import.meta.url), 'utf8')
const reviewHeading = screen.match(/<Text\s+style=\{\[styles\.reviewTitle[\s\S]*?\{t\('reservation\.review'\)\}[\s\S]*?<\/Text>/)?.[0]
const submitButton = screen.match(/<Button\s+title=\{t\('reservation\.submit'\)\}[\s\S]*?loading=\{submitting\}[\s\S]*?\/>/)?.[0]

test('reservation review heading and submit action expose contextual semantics', () => {
  assert.match(resources, /submitAccessibilityHint: 'Potvrdite slanje rezervacije za odabrani termin\.'/)
  assert.ok(reviewHeading, 'Reservation review heading should exist')
  assert.match(reviewHeading, /accessibilityRole="header"/)
  assert.ok(submitButton, 'Reservation submit button should exist')
  assert.match(submitButton, /accessibilityHint=\{t\('reservation\.submitAccessibilityHint'\)\}/)
  assert.match(submitButton, /loading=\{submitting\}/)
})
