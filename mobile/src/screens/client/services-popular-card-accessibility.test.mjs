import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./ServicesScreen.tsx', import.meta.url), 'utf8')
const featuredCard = screen.match(/<Card\s+style=\{styles\.featuredCard\}([\s\S]*?)<\/Card>/)?.[1]

test('popular-service card exposes localized service details and action hint', () => {
  assert.match(resources, /popularServiceAccessibilityLabel: '\{\{service\}\}, \{\{duration\}\} min\.'/)
  assert.match(resources, /popularServiceAccessibilityLabelWithReservations: '\{\{service\}\}, \{\{duration\}\} min\. Rezervacije: \{\{count\}\}\.'/)
  assert.match(resources, /popularServiceHint: 'Otvara detalje popularne usluge\.'/)
  assert.ok(featuredCard, 'Featured service card should exist')
  assert.match(featuredCard, /accessibilityRole="button"/)
  assert.match(featuredCard, /t\('services\.popularServiceAccessibilityLabelWithReservations'/)
  assert.match(featuredCard, /t\('services\.popularServiceAccessibilityLabel'/)
  assert.match(featuredCard, /accessibilityHint=\{t\('services\.popularServiceHint'\)\}/)
  assert.match(featuredCard, /navigate\('ServiceSingleDetail', \{\s*serviceId: featuredService\.id/)
})
