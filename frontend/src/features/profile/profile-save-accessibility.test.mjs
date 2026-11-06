import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/Profile.tsx', import.meta.url), 'utf8')

test('profile save form exposes busy feedback and disables its submit action', () => {
  assert.match(source, /role="status" aria-live="polite" className="sr-only">\s*\{t\('common\.saving'\)\}/)
  assert.match(source, /<form\s+onSubmit=\{handleSave\}[\s\S]*?aria-busy=\{saving\}/)
  assert.match(source, /type="submit"[\s\S]*?disabled=\{[\s\S]*?saving[\s\S]*?\}[\s\S]*?aria-busy=\{saving\}/)
})

test('profile save blocks duplicate submits and suppresses stale UI results', () => {
  assert.match(source, /const profileSaveGeneration = useRef\(0\)/)
  assert.match(source, /const profileSaveInFlight = useRef\(false\)/)
  assert.match(source, /if \(\s*profileSaveInFlight\.current \|\|\s*avatarPrivacyInFlight\.current \|\|\s*!user\?\.sub\s*\) return/)
  assert.match(source, /profileSaveGeneration\.current \+= 1/)
  assert.match(source, /if \(generation !== profileSaveGeneration\.current\) return/)
  assert.match(source, /if \(generation === profileSaveGeneration\.current\) \{\s*profileSaveInFlight\.current = false\s*setSaving\(false\)/)
})

test('profile update refreshes auth data and handles changed-email verification outcome', () => {
  const update = source.indexOf('await api.patch(`/api/users/${user.sub}`')
  const refresh = source.indexOf('await refreshProfile()', update)
  const sendCode = source.indexOf("api.post('/auth/send-verification-email')", refresh)
  const reload = source.indexOf('await loadProfile()', sendCode)
  assert.ok(update >= 0 && refresh > update && sendCode > refresh && reload > sendCode)
  assert.match(source, /toast\.success\(t\('profile\.toast\.updated'\)\)/)
  assert.match(source, /profile\.toast\.updatedVerificationSent/)
  assert.match(source, /profile\.toast\.updatedVerificationPending/)
  assert.match(source, /if \(usernameStatus\.loading\) return/)
})
