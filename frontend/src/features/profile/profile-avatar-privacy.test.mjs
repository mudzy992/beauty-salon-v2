import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/Profile.tsx', import.meta.url), 'utf8')

test('avatar privacy control announces saving and disables mutation while pending', () => {
  assert.match(source, /disabled=\{!avatar \|\| avatarPrivacySaving \|\| saving\}/)
  assert.match(source, /avatarPrivacySaving \? \([\s\S]*?role="status" aria-live="polite" className="sr-only">\s*\{t\('common\.saving'\)\}/)
})

test('avatar visibility changes guard duplicate and stale requests', () => {
  assert.match(source, /const avatarPrivacyGeneration = useRef\(0\)/)
  assert.match(source, /const avatarPrivacyInFlight = useRef\(false\)/)
  assert.match(source, /if \(avatarPrivacyInFlight\.current \|\| profileSaveInFlight\.current\) return/)
  assert.match(source, /profileSaveInFlight\.current \|\|\s*avatarPrivacyInFlight\.current \|\|\s*emailVerificationInFlight\.current \|\|\s*!user\?\.sub/)
  assert.match(source, /avatarPrivacySaving \|\|\s*sendingCode \|\|\s*verifying \|\|\s*usernameStatus\.loading/)
  assert.match(source, /avatarPrivacyGeneration\.current \+= 1/)
  assert.match(source, /if \(generation !== avatarPrivacyGeneration\.current\) return/)
  assert.match(source, /if \(generation === avatarPrivacyGeneration\.current\) \{\s*avatarPrivacyInFlight\.current = false\s*setAvatarPrivacySaving\(false\)/)
})

test('avatar visibility mutation preserves optimistic update, profile refresh, and rollback on failure', () => {
  const update = source.indexOf("api.patch<{ isAvatarPublic: boolean }>(\n        '/api/users/profile/avatar-visibility'")
  const refresh = source.indexOf('await refreshProfile()', update)
  const confirmed = source.indexOf('setIsAvatarPublic(confirmedValue)', refresh)
  assert.ok(update >= 0 && refresh > update && confirmed > refresh)
  assert.match(source, /setIsAvatarPublic\(nextValue\)/)
  assert.match(source, /setIsAvatarPublic\(previousValue\)/)
  assert.match(source, /typeof data\?\.isAvatarPublic === 'boolean' \? data\.isAvatarPublic : nextValue/)
})
