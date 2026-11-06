import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/Profile.tsx', import.meta.url), 'utf8')

test('username availability debounces normalized values and clears stale feedback while checking', () => {
  assert.match(source, /const normalizedUsername = username\.trim\(\)/)
  assert.match(source, /setUsernameStatus\(\{\s*loading: true,\s*available: null,\s*isCurrentUsername: false,\s*suggestions: \[\],\s*error: false,\s*\}\)/)
  assert.match(source, /params: \{ username: normalizedUsername \}/)
  assert.match(source, /\}, 300\)/)
  assert.match(source, /disabled=\{\s*saving \|\|\s*avatarPrivacySaving \|\|\s*usernameStatus\.loading \|\|\s*usernameStatus\.available === false\s*\}/)
  assert.match(source, /usernameStatus\.error \? \([\s\S]*?role="alert"[\s\S]*?\{t\('profile\.username\.checkFailed'\)\}/)
})

test('username availability ignores stale and unmounted success and failure responses', () => {
  assert.match(source, /const usernameAvailabilityGeneration = useRef\(0\)/)
  assert.match(source, /const generation = \+\+usernameAvailabilityGeneration\.current/)
  assert.match(source, /if \(generation !== usernameAvailabilityGeneration\.current\) return/)
  assert.match(source, /window\.clearTimeout\(timeout\)[\s\S]*?usernameAvailabilityGeneration\.current \+= 1/)
})

test('username availability validates response fields before exposing state or suggestions', () => {
  assert.match(source, /const hasAvailability = typeof data\?\.available === 'boolean'[\s\S]*?available: hasAvailability \? data\.available : null/)
  assert.match(source, /isCurrentUsername: data\?\.isCurrentUsername === true/)
  assert.match(source, /data\.suggestions\.filter\(\(suggestion: unknown\): suggestion is string =>\s*typeof suggestion === 'string'/)
  assert.match(source, /error: !hasAvailability/)
  assert.match(source, /available: null,[\s\S]*?suggestions: \[\],[\s\S]*?error: true/)
})
