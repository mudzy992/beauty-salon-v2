import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveAdminApiErrorKey } from './admin-api-error.mjs'

test('maps known user, debt, and stylist errors to locale keys', () => {
  assert.equal(
    resolveAdminApiErrorKey('Spol je obavezan.', 'users.errors.createFailed'),
    'users.errors.genderRequired',
  )
  assert.equal(
    resolveAdminApiErrorKey('Spol je obavezan za klijente.', 'users.errors.updateFailed'),
    'users.validation.genderRequiredForClients',
  )
  assert.equal(
    resolveAdminApiErrorKey('Korisničko ime je već u upotrebi.', 'users.errors.createFailed'),
    'users.errors.usernameTaken',
  )
  assert.equal(
    resolveAdminApiErrorKey('Dug je u međuvremenu zatvoren.', 'users.errors.writeOffFailed'),
    'users.errors.debtClosed',
  )
  assert.equal(
    resolveAdminApiErrorKey('Rola STYLIST nije pronađena.', 'users.errors.assignRoleFailed'),
    'users.errors.roleNotFound',
  )
  assert.equal(
    resolveAdminApiErrorKey('Datum mora biti validan YYYY-MM-DD.', 'stylists.errors.saveFailed'),
    'stylists.errors.invalidHireDate',
  )
  assert.equal(
    resolveAdminApiErrorKey('Nemate dozvolu za izmjenu ovog profila.', 'stylists.errors.saveFailed'),
    'stylists.errors.permissionDenied',
  )
  assert.equal(
    resolveAdminApiErrorKey('Nemate dozvolu za izmjenu ovog korisnika.', 'users.errors.updateFailed'),
    'users.errors.permissionDenied',
  )
})

test('uses the localized operation fallback for unknown or malformed errors', () => {
  assert.equal(
    resolveAdminApiErrorKey('unknown backend message', 'users.errors.updateFailed'),
    'users.errors.updateFailed',
  )
  assert.equal(resolveAdminApiErrorKey(['invalid', 'response'], 'users.errors.createFailed'), 'users.errors.createFailed')
  assert.equal(resolveAdminApiErrorKey(undefined, 'stylists.errors.saveFailed'), 'stylists.errors.saveFailed')
})
