import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/Profile.tsx', import.meta.url), 'utf8')

test('avatar upload uses the authenticated own-avatar endpoint and rejects non-image selections early', () => {
  assert.match(source, /if \(!file\.type\.startsWith\('image\/'\)\)[\s\S]*?toast\.error\(t\('profile\.errors\.imageRequired'\)\)/)
  assert.match(source, /api\.post<unknown>\('\/api\/users\/profile\/avatar', fd/)
  assert.match(source, /accept="image\/\*"/)
  assert.match(source, /typeof payload\?\.avatar !== 'string' \|\| !payload\.avatar\.trim\(\)/)
  assert.match(source, /typeof payload\.isAvatarPublic === 'boolean'[\s\S]*?: false/)
})

test('avatar uploads block overlapping profile mutations and ignore stale completions', () => {
  assert.match(source, /const avatarUploadGeneration = useRef\(0\)/)
  assert.match(source, /const avatarUploadInFlight = useRef\(false\)/)
  assert.match(source, /avatarUploadInFlight\.current \|\|[\s\S]*?profileSaveInFlight\.current \|\|[\s\S]*?avatarPrivacyInFlight\.current \|\|[\s\S]*?emailVerificationInFlight\.current/)
  assert.match(source, /if \(generation === avatarUploadGeneration\.current\) \{[\s\S]*?setAvatar\(avatarPath\)/)
  assert.match(source, /if \(generation === avatarUploadGeneration\.current\) \{\s*avatarUploadInFlight\.current = false\s*setUploadingAvatar\(false\)/)
  assert.match(source, /avatarUploadGeneration\.current \+= 1[\s\S]*?avatarUploadInFlight\.current = false/)
})

test('avatar uploads validate the response, update local profile state, and report refresh failures separately', () => {
  const update = source.indexOf('setProfile((current) =>\n          current ? { ...current, avatar: avatarPath')
  const refresh = source.indexOf('await refreshProfile()', update)
  const success = source.indexOf("toast.success(t('profile.toast.avatarUploaded'))", update)
  const uploadError = source.indexOf("showApiError(error, 'profile.errors.avatarUploadFailed')", refresh)
  const refreshError = source.indexOf("showApiError(error, 'profile.errors.loadFailed')", update)
  assert.ok(update >= 0 && success > update && refresh > success && refreshError > refresh && uploadError > refreshError)
  assert.match(source, /if \(fileInputRef\.current\) fileInputRef\.current\.value = ''/)
})

test('avatar upload progress is announced and conflicting controls are disabled', () => {
  assert.match(source, /uploadingAvatar \? \([\s\S]*?role="status" aria-live="polite" className="sr-only">\s*\{t\('profile\.avatar\.uploading'\)\}/)
  assert.match(source, /aria-busy=\{uploadingAvatar\}/)
  assert.match(source, /disabled=\{\s*uploadingAvatar \|\|\s*saving \|\|\s*avatarPrivacySaving \|\|\s*sendingCode \|\|\s*verifying\s*\}/)
  assert.match(source, /disabled=\{\s*!avatar \|\|\s*avatarPrivacySaving \|\|\s*saving \|\|\s*uploadingAvatar \|\|\s*sendingCode \|\|\s*verifying\s*\}/)
  assert.match(source, /avatarPrivacySaving \|\|\s*sendingCode \|\|\s*verifying \|\|\s*uploadingAvatar \|\|\s*usernameStatus\.loading/)
})
