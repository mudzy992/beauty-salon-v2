import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./ReservationScreen.tsx', import.meta.url), 'utf8')
const serviceOption = screen.match(/<Card\s+accessibilityRole="checkbox"([\s\S]*?)onPress=\{\(\) => handleToggleService\(item\)\}/)?.[1]

test('reservation service options expose localized identity and checked state', () => {
  assert.match(resources, /serviceSelectionAccessibilityLabel: '\{\{service\}\}, \{\{duration\}\} min\.'/)
  assert.match(resources, /serviceSelectionAccessibilityHint: 'Odaberite ili uklonite ovu uslugu iz rezervacije\.'/)
  assert.ok(serviceOption, 'Selectable reservation service card should exist')
  assert.match(serviceOption, /accessibilityLabel=\{t\('reservation\.serviceSelectionAccessibilityLabel'/)
  assert.match(serviceOption, /service: item\.name/)
  assert.match(serviceOption, /duration: item\.durationMinutes/)
  assert.match(serviceOption, /accessibilityHint=\{t\('reservation\.serviceSelectionAccessibilityHint'\)\}/)
  assert.match(serviceOption, /accessibilityState=\{\{ checked: isSelected \}\}/)
})
