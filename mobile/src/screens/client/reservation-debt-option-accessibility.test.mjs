import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./ReservationScreen.tsx', import.meta.url), 'utf8')
const debtOption = screen.match(/<TouchableOpacity\s+accessibilityRole="checkbox"[\s\S]*?onPress=\{\(\) => setPayDebtsIntent\([\s\S]*?<\/TouchableOpacity>/)?.[0]

test('reservation debt option exposes localized identity and checked state', () => {
  assert.match(resources, /payDebtsLabel: 'Plaćam i dugovanje'/)
  assert.match(resources, /openDebtAmount: 'Otvoreno: \{\{amount\}\} KM'/)
  assert.match(resources, /payDebtsAccessibilityLabel: 'Plaćam i dugovanje, \{\{amount\}\} KM'/)
  assert.match(resources, /payDebtsAccessibilityHint: 'Uključite da uz rezervaciju zatražite naplatu postojećeg dugovanja\.'/)
  assert.ok(debtOption, 'Reservation debt option should exist')
  assert.match(debtOption, /accessibilityLabel=\{t\('reservation\.payDebtsAccessibilityLabel'/)
  assert.match(debtOption, /amount: openDebtsTotal\.toFixed\(2\)/)
  assert.match(debtOption, /accessibilityHint=\{t\('reservation\.payDebtsAccessibilityHint'\)\}/)
  assert.match(debtOption, /accessibilityState=\{\{ checked: payDebtsIntent \}\}/)
  assert.match(debtOption, /t\('reservation\.payDebtsLabel'\)/)
  assert.match(debtOption, /t\('reservation\.openDebtAmount'/)
})
