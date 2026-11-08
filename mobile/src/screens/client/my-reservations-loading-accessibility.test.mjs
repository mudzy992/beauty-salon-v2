import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./MyReservationsScreen.tsx', import.meta.url), 'utf8')
const loadingIndicator = screen.match(/if \(loading\)[\s\S]*?<ActivityIndicator[\s\S]*?\/>/)?.[0]

test('My Reservations loading state announces localized busy progress', () => {
  assert.match(resources, /loadingReservations: 'Učitavanje rezervacija\.'/)
  assert.ok(loadingIndicator, 'My Reservations loading indicator should exist')
  assert.match(loadingIndicator, /\baccessible\b/)
  assert.match(loadingIndicator, /accessibilityRole="progressbar"/)
  assert.match(loadingIndicator, /accessibilityLabel=\{t\('myReservations\.loadingReservations'\)\}/)
  assert.match(loadingIndicator, /accessibilityState=\{\{ busy: true \}\}/)
  assert.match(loadingIndicator, /accessibilityLiveRegion="polite"/)
})
