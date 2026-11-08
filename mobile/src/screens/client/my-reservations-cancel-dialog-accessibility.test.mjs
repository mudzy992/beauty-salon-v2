import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const screen = readFileSync(new URL('./MyReservationsScreen.tsx', import.meta.url), 'utf8')
const cancelDialog = screen.match(/<Modal[\s\S]*?\n    <\/Modal>/)?.[0]

test('My Reservations cancellation dialog exposes modal and heading semantics', () => {
  assert.ok(cancelDialog, 'cancellation modal should exist')
  assert.match(cancelDialog, /accessibilityViewIsModal/)
  assert.match(cancelDialog, /<Text\b[^>]*\baccessibilityRole="header"[^>]*>[\s\S]*?\{t\('myReservations\.cancelReservation'\)\}/)
})
