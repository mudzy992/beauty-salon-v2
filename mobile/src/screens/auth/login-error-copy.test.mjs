import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const screen = readFileSync(new URL('./LoginScreen.tsx', import.meta.url), 'utf8')

test('login failures use localized network, credential, server, and generic fallback copy', () => {
  assert.match(screen, /if \(!axiosError\.response\) return copy\.network/)
  assert.match(screen, /if \(axiosError\.response\.status === 401\) return copy\.invalidCredentials/)
  assert.match(screen, /if \(axiosError\.response\.status >= 500\) return copy\.server/)
  assert.match(screen, /return copy\.fallback/)
  assert.match(screen, /getApiErrorMessage\(error, ''\)/)
  assert.match(screen, /network: t\('auth\.loginNetworkError'\)/)
  assert.match(screen, /invalidCredentials: t\('auth\.loginInvalidCredentials'\)/)
  assert.match(screen, /server: t\('auth\.loginServerError'\)/)
  assert.match(screen, /fallback: t\('auth\.loginError'\)/)
})
