import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const screen = readFileSync(new URL('../../../app/onboarding/phone.tsx', import.meta.url), 'utf8')

test('phone onboarding labels the phone field and enables platform phone autofill', () => {
  assert.match(
    screen,
    /<Input\s+label=\{t\('auth\.phone'\)\}[\s\S]*?keyboardType="phone-pad"\s+autoComplete="tel"\s+textContentType="telephoneNumber"/,
  )
  assert.match(screen, /<Button title=\{t\('onboarding\.savePhone'\)\} onPress=\{handleSave\} loading=\{loading\}/)
  assert.match(screen, /title=\{t\('onboarding\.skipPhone'\)\}[\s\S]*?onPress=\{handleSkip\}/)
})
