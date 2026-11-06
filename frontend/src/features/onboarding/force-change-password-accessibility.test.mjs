import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/ForceChangePassword.tsx', import.meta.url), 'utf8')

test('forced password-change form labels all required fields and mirrors backend constraints', () => {
  assert.match(source, /<Label htmlFor="currentPassword">[\s\S]*?<Input[\s\S]*?id="currentPassword"[\s\S]*?autoComplete="current-password"[\s\S]*?required[\s\S]*?disabled=\{loading\}/)
  for (const id of ['newPassword', 'confirmPassword']) {
    assert.match(source, new RegExp(`<Label htmlFor="${id}">[\\s\\S]*?<Input[\\s\\S]*?id="${id}"[\\s\\S]*?autoComplete="new-password"[\\s\\S]*?required[\\s\\S]*?minLength=\\{6\\}[\\s\\S]*?disabled=\\{loading\\}`))
  }
})

test('password-change submission announces loading and prevents duplicate submits', () => {
  assert.match(source, /<form\s+onSubmit=\{handleSubmit\}[\s\S]*?aria-busy=\{loading\}/)
  assert.match(source, /role="status" aria-live="polite" className="sr-only">\s*\{t\('common\.loading'\)\}/)
  assert.match(source, /disabled=\{loading\}[\s\S]*?aria-busy=\{loading\}/)
  assert.match(source, /if \(requestInFlight\.current\) return/)
  assert.match(source, /requestGeneration\.current \+= 1/)
  assert.match(source, /if \(generation === requestGeneration\.current\) \{\s*requestInFlight\.current = false\s*setLoading\(false\)/)
})

test('successful password change rotates the token, refreshes the profile, then redirects', () => {
  const rotateToken = source.indexOf('replaceToken(response.data.access_token)')
  const refreshProfile = source.indexOf('const updated = await refreshProfile()')
  const redirect = source.indexOf('navigate(getPostAuthRedirectPath(updated), { replace: true })')
  assert.ok(rotateToken >= 0 && refreshProfile > rotateToken && redirect > refreshProfile)
  assert.match(source, /if \(generation !== requestGeneration\.current\) return/)
  assert.match(source, /error\?\.response\?\.data\?\.message \|\| t\('onboarding\.passwordChangeFailed'\)/)
})
