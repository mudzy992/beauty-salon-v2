import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/ResetPassword.tsx', import.meta.url), 'utf8')

test('reset-password form has one heading and labeled native password constraints', () => {
  assert.equal([...source.matchAll(/<h1\b/g)].length, 1)
  assert.match(source, /<Label htmlFor="reset-new-password">[\s\S]*?<Input[\s\S]*?id="reset-new-password"[\s\S]*?type="password"[\s\S]*?autoComplete="new-password"[\s\S]*?required[\s\S]*?minLength=\{6\}/)
  assert.match(source, /<Label htmlFor="reset-confirm-password">[\s\S]*?<Input[\s\S]*?id="reset-confirm-password"[\s\S]*?type="password"[\s\S]*?autoComplete="new-password"[\s\S]*?required[\s\S]*?minLength=\{6\}/)
})

test('reset submission exposes busy, success, and error announcements', () => {
  assert.match(source, /<form\s+onSubmit=\{handleSubmit\}[\s\S]*?aria-busy=\{loading\}/)
  assert.match(source, /type="submit"[\s\S]*?disabled=\{loading\}[\s\S]*?aria-busy=\{loading\}/)
  assert.match(source, /role="status" aria-live="polite" className="sr-only">\s*\{t\('common\.loading'\)\}/)
  assert.match(source, /role=\{completed \? 'status' : undefined\}[\s\S]*?aria-live=\{completed \? 'polite' : undefined\}/)
  assert.match(source, /role="alert"/)
})

test('reset request blocks duplicates and ignores stale or unmounted results', () => {
  assert.match(source, /if \(requestInFlight\.current\) return/)
  assert.match(source, /requestGeneration\.current \+= 1/)
  assert.match(source, /if \(!isCurrentRequest\(generation\)\) return/)
  assert.match(source, /if \(isCurrentRequest\(generation\)\) \{\s*requestInFlight\.current = false\s*setLoading\(false\)/)
})

test('reset link token is read from the current query and removed from browser history', () => {
  assert.match(source, /new URLSearchParams\(location\.search\)\.get\('token'\)/)
  assert.match(source, /window\.history\.replaceState\(window\.history\.state, '', location\.pathname\)/)
  assert.match(source, /if \(previousToken\.current !== token\)[\s\S]*?setNewPassword\(''\)[\s\S]*?setConfirmPassword\(''\)/)
  assert.match(source, /api\.post\('\/auth\/reset-password', \{ token, newPassword \}\)/)
})
