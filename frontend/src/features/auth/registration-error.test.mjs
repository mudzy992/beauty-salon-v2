import assert from 'node:assert/strict'
import test from 'node:test'

import { getRegistrationErrorKey } from './registration-error.mjs'

test('maps known backend registration conflicts to locale keys', () => {
  assert.equal(
    getRegistrationErrorKey('Email je već u upotrebi.'),
    'auth.emailAlreadyInUse',
  )
  assert.equal(
    getRegistrationErrorKey(' Korisničko ime je već u upotrebi. '),
    'auth.usernameAlreadyInUse',
  )
  assert.equal(
    getRegistrationErrorKey('Lozinka mora imati najmanje 8 karaktera.'),
    'auth.passwordMinLength',
  )
})

test('uses a localized generic message for unknown or malformed errors', () => {
  assert.equal(getRegistrationErrorKey('Unknown backend detail'), 'auth.registrationError')
  assert.equal(getRegistrationErrorKey(['validation failed']), 'auth.registrationError')
  assert.equal(getRegistrationErrorKey(null), 'auth.registrationError')
})
