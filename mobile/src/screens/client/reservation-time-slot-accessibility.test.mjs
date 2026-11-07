import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./ReservationScreen.tsx', import.meta.url), 'utf8')
const timeSlot = screen.match(/<TouchableOpacity\s+key=\{idx\}([\s\S]*?)onPress=\{\(\) => !isDisabled && handleSelectSlot\(slot\)\}/)?.[1]

test('reservation time slots expose localized radio identity, selected state, and availability', () => {
  assert.match(resources, /timeSlotAccessibilityLabel: 'Termin u \{\{time\}\}'/)
  assert.match(resources, /timeSlotAccessibilityHint: 'Odaberite ovaj termin\.'/)
  assert.ok(timeSlot, 'Reservation time-slot option should exist')
  assert.match(timeSlot, /accessibilityRole="radio"/)
  assert.match(timeSlot, /accessibilityLabel=\{t\('reservation\.timeSlotAccessibilityLabel'/)
  assert.match(timeSlot, /time: formatTime\(slot\.startTime\)/)
  assert.match(timeSlot, /accessibilityHint=\{t\('reservation\.timeSlotAccessibilityHint'\)\}/)
  assert.match(timeSlot, /accessibilityState=\{\{ selected: isSelected, disabled: isDisabled \}\}/)
  assert.match(screen, /disabled=\{isDisabled\}/)
})
