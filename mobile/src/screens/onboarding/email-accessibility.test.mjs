import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const screen = readFileSync(new URL('../../../app/onboarding/email.tsx', import.meta.url), 'utf8')

test('successful verification-code sending politely announces the newly revealed code step', () => {
  assert.match(screen, /if \(isCurrentRequest\(\)\) setCodeSent\(true\)/)
  assert.match(
    screen,
    /\{codeSent \? \([\s\S]*?<View style=\{styles\.codeBlock\}>\s*<Text\s+accessibilityRole="text"\s+accessibilityLiveRegion="polite"[\s\S]*?t\('profile\.verifyEmailCodeSent'\)[\s\S]*?<\/Text>\s*<Input/,
  )
  assert.match(screen, /label=\{t\('profile\.verifyEmailEnterCode'\)\}/)
  assert.match(screen, /<Button title=\{t\('onboarding\.verifyEmail'\)\} onPress=\{handleVerify\} loading=\{loading\}/)
  assert.match(screen, /<Button\s+title=\{t\('onboarding\.sendCode'\)\}\s+onPress=\{handleResendCode\}/)
})
