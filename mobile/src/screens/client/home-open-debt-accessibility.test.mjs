import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./HomeScreen.tsx', import.meta.url), 'utf8')

test('home open-debt action has a localized contextual name and action hint', () => {
  assert.match(resources, /openDebtAccessibilityLabel: 'Otvorena dugovanja: \{\{count\}\}\. Ukupno \{\{amount\}\} KM\.'/)
  assert.match(resources, /openDebtHint: 'Otvara profil i detalje dugovanja\.'/)
  assert.match(screen, /accessibilityRole="button"\s+accessibilityLabel=\{t\('home\.openDebtAccessibilityLabel', \{\s+count: openDebtsCount,\s+amount: openDebtsTotal\.toFixed\(2\),\s+\}\)\}\s+accessibilityHint=\{t\('home\.openDebtHint'\)\}/)
  assert.match(screen, /\?\.navigate\(\s*'ProfileTab',\s*\)/)
})
