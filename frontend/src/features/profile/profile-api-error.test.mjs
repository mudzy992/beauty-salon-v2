import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { resolveProfileApiErrorKey } from './profile-api-error.mjs'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(
    readFileSync(new URL(`../../i18n/locales/${language}.json`, import.meta.url), 'utf8'),
  ),
)

const hasLocaleKey = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource) !== undefined

test('maps known profile API errors to localized keys', () => {
  assert.equal(
    resolveProfileApiErrorKey('Spol je obavezan za klijente.', 'profile.errors.updateFailed'),
    'users.validation.genderRequiredForClients',
  )
  assert.equal(
    resolveProfileApiErrorKey('Email je već u upotrebi.', 'profile.errors.updateFailed'),
    'users.errors.emailTaken',
  )
  assert.equal(
    resolveProfileApiErrorKey(
      'Kod nije ispravan ili je istekao. Zatražite novi kod.',
      'profile.errors.verifyFailed',
    ),
    'profile.errors.invalidVerificationCode',
  )
  assert.equal(
    resolveProfileApiErrorKey(
      'Prvo postavite avatar pa ga zatim učinite javnim.',
      'profile.errors.avatarVisibilityFailed',
    ),
    'profile.errors.avatarRequiredForPublic',
  )
})

test('keeps the operation-specific localized fallback for unknown or malformed errors', () => {
  assert.equal(
    resolveProfileApiErrorKey('new backend message', 'profile.errors.updateFailed'),
    'profile.errors.updateFailed',
  )
  assert.equal(resolveProfileApiErrorKey(['invalid'], 'profile.errors.verifyFailed'), 'profile.errors.verifyFailed')
  assert.equal(resolveProfileApiErrorKey(undefined, 'profile.errors.avatarUploadFailed'), 'profile.errors.avatarUploadFailed')
})

test('profile, media-consent, error, and fallback keys exist in both web locales', () => {
  const keys = [
    'users.errors.notFound',
    'users.errors.usernameTaken',
    'users.errors.usernameInvalid',
    'users.errors.emailTaken',
    'users.validation.genderRequiredForClients',
    'users.errors.permissionDenied',
    'profile.errors.emailRequired',
    'profile.errors.emailAlreadyVerified',
    'profile.errors.invalidVerificationCode',
    'profile.errors.avatarRequiredForPublic',
    'profile.errors.avatarUploadFailed',
    'profile.errors.loadFailed',
    'profile.errors.updateFailed',
    'profile.errors.avatarVisibilityFailed',
    'profile.errors.verifyFailed',
    'profile.errors.sendCodeFailed',
    'profile.errors.imageRequired',
    'profile.toast.avatarUploaded',
    'profile.toast.avatarMadePublic',
    'profile.toast.avatarMadePrivate',
    'profile.toast.updated',
    'profile.toast.updatedVerificationSent',
    'profile.toast.updatedVerificationPending',
    'profile.toast.verificationCodeSent',
    'profile.toast.emailVerified',
    'mediaConsent.photoBefore',
    'mediaConsent.photoAfter',
    'users.roleNames.SYSTEM_ADMIN',
    'users.roleNames.OWNER',
    'users.roleNames.CLIENT',
    'users.roleNames.STYLIST',
  ]
  const uiSources = [
    new URL('../../pages/Profile.tsx', import.meta.url),
    new URL('../media-consent/media-consent-panel.tsx', import.meta.url),
  ]
  for (const sourcePath of uiSources) {
    const source = readFileSync(sourcePath, 'utf8')
    for (const [, key] of source.matchAll(/\bt\('([^']+)'/g)) keys.push(key)
  }

  for (const resource of locales) {
    for (const key of keys) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }
})
