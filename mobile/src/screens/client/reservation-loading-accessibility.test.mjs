import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./ReservationScreen.tsx', import.meta.url), 'utf8')
const indicators = screen.match(/<ActivityIndicator\b[\s\S]*?\/>/g) ?? []

 test('reservation loading indicators announce localized progress and busy state', () => {
  assert.equal(indicators.length, 7, 'All reservation loading indicators should be covered')
  for (const indicator of indicators) {
    assert.match(indicator, /\baccessible\b/)
    assert.match(indicator, /accessibilityRole="progressbar"/)
    assert.match(indicator, /accessibilityLabel=\{t\('(?:common|reservation)\.[^']+'\)\}/)
    assert.match(indicator, /accessibilityState=\{\{ busy: true \}\}/)
    assert.match(indicator, /accessibilityLiveRegion="polite"/)
  }
  assert.match(resources, /loadingServices: 'Učitavanje usluga\.'/)
  assert.match(resources, /loadingDates: 'Učitavanje dostupnih datuma\.'/)
  assert.match(resources, /loadingSlots: 'Učitavanje dostupnih termina\.'/)
  assert.match(resources, /loadingLoyaltyPreview: 'Učitavanje pregleda popusta lojalnosti\.'/)
  assert.match(resources, /loadingDebtPreview: 'Učitavanje stanja dugovanja\.'/)
})
