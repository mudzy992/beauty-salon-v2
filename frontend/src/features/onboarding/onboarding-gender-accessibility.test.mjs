import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/onboarding/OnboardingGender.tsx', import.meta.url), 'utf8')

test('gender choices form a named group and expose their selected state', () => {
  assert.match(source, /<form onSubmit=\{handleContinue\} aria-busy=\{saving\}/)
  assert.match(source, /<fieldset disabled=\{saving\} className="min-w-0 space-y-4">\s*<legend className="font-semibold text-slate-900">\s*\{t\('onboarding\.genderLabel'\)\}/)
  assert.match(source, /variant=\{gender === 'MALE' \? 'default' : 'outline'\}\s+aria-pressed=\{gender === 'MALE'\}/)
  assert.match(source, /variant=\{gender === 'FEMALE' \? 'default' : 'outline'\}\s+aria-pressed=\{gender === 'FEMALE'\}/)
})

test('gender save announces progress and prevents duplicate or stale UI updates', () => {
  assert.match(source, /role="status" aria-live="polite" className="sr-only">\s*\{t\('common\.saving'\)\}/)
  assert.match(source, /type="submit" disabled=\{saving\}[\s\S]*?aria-busy=\{saving\}/)
  assert.match(source, /if \(requestInFlight\.current\) return/)
  assert.match(source, /requestGeneration\.current \+= 1/)
  assert.match(source, /if \(generation !== requestGeneration\.current\) return/)
  assert.match(source, /if \(generation === requestGeneration\.current\) \{\s*requestInFlight\.current = false\s*setSaving\(false\)/)
})

test('gender profile update and subsequent profile refresh still precede onboarding navigation', () => {
  const update = source.indexOf("api.put('/api/users/profile', { gender })")
  const refresh = source.indexOf('await refreshProfile()', update)
  const navigate = source.indexOf("navigate('/onboarding/email', { replace: true })", refresh)
  assert.ok(update >= 0 && refresh > update && navigate > refresh)
  assert.match(source, /if \(!gender\)[\s\S]*?toast\.warning\(t\('onboarding\.genderRequired'\)\)/)
  assert.match(source, /error\?\.response\?\.data\?\.message \|\| t\('onboarding\.profileSaveFailed'\)/)
})
