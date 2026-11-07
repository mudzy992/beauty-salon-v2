import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const sources = [
  ['../screens/auth/RegisterScreen.tsx', 'mobile/src/screens/auth/RegisterScreen.tsx'],
  ['../screens/client/ChangePasswordScreen.tsx', 'mobile/src/screens/client/ChangePasswordScreen.tsx'],
  ['../screens/stylist/reservation-detail/utils/reservation-detail.ts', 'mobile/src/screens/stylist/reservation-detail/utils/reservation-detail.ts'],
  ['../screens/auth/LoginScreen.tsx', 'mobile/src/screens/auth/LoginScreen.tsx'],
  ['../../app/onboarding/email.tsx', 'mobile/app/onboarding/email.tsx'],
  ['../../app/onboarding/phone.tsx', 'mobile/app/onboarding/phone.tsx'],
  ['../../app/onboarding/gender.tsx', 'mobile/app/onboarding/gender.tsx'],
].map(([url, path]) => [path, readFileSync(new URL(url, import.meta.url), 'utf8')])

test('auth, onboarding, password, and reservation-detail errors use the bounded safe parser', () => {
  for (const [path, source] of sources) {
    assert.match(source, /getApiErrorMessage/, path)
    assert.doesNotMatch(source, /response\??\.data\??\.message|response\?:\s*\{\s*data\?:\s*\{\s*message/, path)
  }
  assert.match(sources[0][1], /getApiErrorMessage\(error, t\('auth\.registerError'\)\)/)
  assert.match(sources[1][1], /getApiErrorMessage\(err, t\('common\.error'\)\)/)
  assert.match(sources[2][1], /getApiErrorMessage = getSafeApiErrorMessage/)
  assert.match(sources[3][1], /getApiErrorMessage\(error, ''\)/)
  for (const [path, source] of sources.slice(4)) {
    assert.match(source, /getApiErrorMessage\(error, t\('common\.error'\)\)/, path)
    assert.match(source, /const beginRequest = \(\) =>/, path)
    assert.match(source, /useAuthStore\.getState\(\)\.user\?\.id === requestUserId/, path)
    assert.match(source, /generation === requestGeneration\.current/, path)
  }
})
