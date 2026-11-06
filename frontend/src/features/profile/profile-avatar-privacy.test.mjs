import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/Profile.tsx', import.meta.url), 'utf8')

test('avatar privacy control announces saving and disables mutation while pending', () => {
  assert.match(source, /disabled=\{\s*!avatar \|\|\s*avatarPrivacySaving \|\|\s*saving \|\|\s*uploadingAvatar \|\|\s*sendingCode \|\|\s*verifying\s*\}/)
  assert.match(source, /avatarPrivacySaving \? \([\s\S]*?role="status" aria-live="polite" className="sr-only">\s*\{t\('common\.saving'\)\}/)
})

test('avatar visibility changes guard duplicate, stale, and overlapping profile mutations', () => {
  assert.match(source, /const avatarPrivacyGeneration = useRef\(0\)/)
  assert.match(source, /const avatarPrivacyInFlight = useRef\(false\)/)
  assert.match(source, /if \(\s*avatarPrivacyInFlight\.current \|\|\s*profileSaveInFlight\.current \|\|\s*emailVerificationInFlight\.current \|\|\s*avatarUploadInFlight\.current\s*\) return/)
  assert.match(source, /profileSaveInFlight\.current \|\|\s*avatarPrivacyInFlight\.current \|\|\s*emailVerificationInFlight\.current \|\|\s*avatarUploadInFlight\.current \|\|\s*!user\?\.sub/)
  assert.match(source, /avatarPrivacySaving \|\|\s*sendingCode \|\|\s*verifying \|\|\s*uploadingAvatar \|\|\s*usernameStatus\.loading/)
  assert.match(source, /avatarPrivacyGeneration\.current \+= 1/)
  assert.match(source, /if \(generation === avatarPrivacyGeneration\.current\) \{\s*avatarPrivacyInFlight\.current = false\s*setAvatarPrivacySaving\(false\)/)
})

test('avatar privacy state rolls back only on mutation failure, not on profile-refresh failure', () => {
  const update = source.indexOf("'/api/users/profile/avatar-visibility'")
  const confirmed = source.indexOf('setIsAvatarPublic(confirmedValue)', update)
  const refresh = source.indexOf('await refreshProfile()', confirmed)
  const mutationRollback = source.indexOf('setIsAvatarPublic(previousValue)', update)
  const mutationError = source.indexOf("showApiError(error, 'profile.errors.avatarVisibilityFailed')", mutationRollback)
  const refreshError = source.indexOf("showApiError(error, 'profile.errors.loadFailed')", refresh)
  assert.ok(update >= 0 && confirmed > update && refresh > confirmed)
  assert.ok(mutationRollback > update && mutationRollback < refresh)
  assert.ok(mutationError > mutationRollback && refreshError > refresh)
  assert.equal(source.indexOf('setIsAvatarPublic(previousValue)', refresh), -1)
  assert.match(source, /setIsAvatarPublic\(nextValue\)/)
  assert.match(source, /typeof data\?\.isAvatarPublic === 'boolean' \? data\.isAvatarPublic : nextValue/)
})
