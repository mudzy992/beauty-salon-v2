import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const profileNotice = readFileSync(new URL('./ProfileRefreshNotice.tsx', import.meta.url), 'utf8')
const sessionNotice = readFileSync(new URL('./SessionBootstrapNotice.tsx', import.meta.url), 'utf8')

test('runtime profile-refresh failures announce politely without swallowing the retry action', () => {
  assert.match(
    profileNotice,
    /<Text\s+accessibilityRole="alert"\s+accessibilityLiveRegion="polite"[\s\S]*?t\('auth\.profileRefreshUnavailable'\)/,
  )
  assert.match(profileNotice, /<Button title=\{t\('common\.retry'\)\} onPress=\{onRetry\} loading=\{loading\}/)
})

test('session-bootstrap failure keeps a heading, readable reason, and retry control', () => {
  assert.match(sessionNotice, /accessibilityRole="header"[\s\S]*?t\('auth\.sessionCheckTitle'\)/)
  assert.match(sessionNotice, /accessibilityRole="text"[\s\S]*?t\(messageKey\)/)
  assert.match(sessionNotice, /<Button\s+title=\{t\('common\.retry'\)\}[\s\S]*?loading=\{isRetrying\}/)
})
