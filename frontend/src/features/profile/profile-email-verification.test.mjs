import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/Profile.tsx', import.meta.url), 'utf8')

test('email verification code input exposes suitable mobile and autofill semantics', () => {
  assert.match(source, /<Input\s+aria-label=\{t\('profile\.email\.codePlaceholder'\)\}[\s\S]*?inputMode="numeric"[\s\S]*?autoComplete="one-time-code"[\s\S]*?maxLength=\{6\}[\s\S]*?pattern="\[0-9\]\{6\}"/)
  assert.match(source, /disabled=\{\s*sendingCode \|\|\s*verifying \|\|\s*saving \|\|\s*avatarPrivacySaving \|\|\s*uploadingAvatar\s*\}/)
  assert.ok(source.includes('!/^\\d{6}$/.test(verifyToken.trim())'))
})

test('email verification actions prevent duplicates, stale UI completion, and profile-save overlap', () => {
  assert.match(source, /const emailVerificationGeneration = useRef\(0\)/)
  assert.match(source, /const emailVerificationInFlight = useRef\(false\)/)
  assert.match(source, /emailVerificationGeneration\.current \+= 1[\s\S]*?emailVerificationInFlight\.current = false/)
  assert.equal((source.match(/emailVerificationInFlight\.current \|\|\s*profileSaveInFlight\.current/g) ?? []).length, 2)
  assert.match(source, /if \(generation !== emailVerificationGeneration\.current\) return/)
  assert.match(source, /if \(generation === emailVerificationGeneration\.current\) \{\s*emailVerificationInFlight\.current = false\s*set(?:SendingCode|Verifying)\(false\)/)
  assert.match(source, /profileSaveInFlight\.current \|\|\s*avatarPrivacyInFlight\.current \|\|\s*emailVerificationInFlight\.current/)
})

test('verification sends only a trimmed six-digit token and refreshes account and profile state', () => {
  const validation = source.indexOf("if (!/^\\d{6}$/.test(token))")
  const verifyRequest = source.indexOf("api.post('/auth/verify-email', { token })")
  const refresh = source.indexOf('await refreshProfile()', verifyRequest)
  const reload = source.indexOf('await loadProfile()', refresh)
  assert.ok(validation >= 0 && verifyRequest > validation && refresh > verifyRequest && reload > refresh)
  assert.match(source, /const token = verifyToken\.trim\(\)/)
  assert.match(source, /toast\.error\(t\('profile\.errors\.invalidVerificationCode'\)\)/)
  assert.match(source, /setVerifyToken\(''\)[\s\S]*?toast\.success\(t\('profile\.toast\.emailVerified'\)\)/)
  const mutationError = source.indexOf("showApiError(error, 'profile.errors.verifyFailed')", verifyRequest)
  const refreshError = source.indexOf('let refreshError: unknown = null', mutationError)
  const refreshErrorFeedback = source.indexOf("showApiError(refreshError, 'profile.errors.loadFailed')", refreshError)
  assert.ok(mutationError > verifyRequest && refreshError > mutationError && refreshErrorFeedback > refreshError)
})

test('email send and verification requests announce progress and expose disabled actions', () => {
  assert.match(source, /disabled=\{\s*sendingCode \|\|\s*verifying \|\|\s*saving \|\|\s*avatarPrivacySaving \|\|\s*uploadingAvatar \|\|\s*!email\.trim\(\)\s*\}/)
  assert.match(source, /role="status" aria-live="polite" className="sr-only">\s*\{t\(sendingCode \? 'profile\.email\.sendingCode' : 'profile\.email\.verifying'\)\}/)
  assert.match(source, /showApiError\(error, 'profile\.errors\.sendCodeFailed'\)/)
  assert.match(source, /showApiError\(error, 'profile\.errors\.verifyFailed'\)/)
})
