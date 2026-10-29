import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../../i18n/bs.ts', import.meta.url), 'utf8')
const shell = readFileSync(new URL('./reservation-detail-modal-shell.tsx', import.meta.url), 'utf8')

test('reservation modal backdrop accessibility label uses common translation', () => {
  assert.match(resource, /common:\s*\{[\s\S]*?close:\s*'Zatvori'/)
  assert.match(shell, /accessibilityLabel=\{t\('common\.close'\)\}/)
  assert.doesNotMatch(shell, /accessibilityLabel="Zatvori"/)
})

test('reservation modal dismiss interactions remain unchanged', () => {
  assert.match(shell, /<Modal visible=\{visible\} animationType="slide" transparent onRequestClose=\{onClose\}>/)
  assert.match(shell, /<Pressable[\s\S]*?onPress=\{onClose\}/)
  assert.match(shell, /accessibilityRole="button"/)
})
