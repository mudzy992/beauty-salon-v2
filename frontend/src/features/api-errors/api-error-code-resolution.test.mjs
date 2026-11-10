import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveAdminApiError,
  resolveAdminApiErrorKey,
} from '../admin/admin-api-error.mjs'
import { getRegistrationErrorKey } from '../auth/registration-error.mjs'
import { resolveClientReservationError } from '../client-reservations/client-reservation-error.mjs'
import { resolveProfileApiErrorKey } from '../profile/profile-api-error.mjs'
import { resolvePublicReservationError } from '../reservations/public-reservation-error.mjs'
import { API_ERROR_CODE_TO_KEY } from './api-error-code-map.mjs'

// Tekstovi su doslovne poruke iz backend registra (api-error-codes.ts). Namjerno se
// ne citiraju odavde: test mora pasti ako se poruka i kod raziđu.
const MSG_EMAIL_TAKEN = 'Email je već u upotrebi.'
const MSG_USER_NOT_FOUND = 'Korisnik nije pronađen.'
const MSG_SLOT_UNAVAILABLE = 'Odabrani termin nije dostupan.'
const MSG_SERVICE_NOT_FOUND = 'Servis nije pronađen.'
const MSG_EMAIL_VERIFIED = 'Email adresa je već potvrđena.'

test('kod iz registra ima prednost nad bosanskim tekstom (admin resolver)', () => {
  // Tekst bi sam po sebi dao users.errors.emailTaken; kod mora pobijediti.
  assert.equal(API_ERROR_CODE_TO_KEY.USERS_EMAIL_TAKEN, 'users.errors.emailTaken')
  assert.equal(API_ERROR_CODE_TO_KEY.USERS_NOT_FOUND, 'users.errors.notFound')
  assert.deepEqual(
    resolveAdminApiError(MSG_EMAIL_TAKEN, 'common.error', 'USERS_NOT_FOUND'),
    { key: 'users.errors.notFound', values: undefined },
    'kod USERS_NOT_FOUND je morao pobijediti tekst o emailu',
  )
})

test('bez koda admin resolver i dalje radi po tekstu (nema regresije za stare odgovore)', () => {
  assert.deepEqual(resolveAdminApiError(MSG_EMAIL_TAKEN, 'common.error'), {
    key: 'users.errors.emailTaken',
    values: undefined,
  })
  // Tekst koji nije u mapi -> fallback ključ pozivatelja.
  assert.deepEqual(resolveAdminApiError('Neka sasvim nova poruka.', 'common.error'), {
    key: 'common.error',
    values: undefined,
  })
})

test('nepoznat ili prazan kod pada nazad na tekst, pa na fallback', () => {
  assert.deepEqual(resolveAdminApiError(MSG_EMAIL_TAKEN, 'common.error', 'KOD_KOGA_NEMA'), {
    key: 'users.errors.emailTaken',
    values: undefined,
  })
  assert.deepEqual(resolveAdminApiError(MSG_EMAIL_TAKEN, 'common.error', undefined), {
    key: 'users.errors.emailTaken',
    values: undefined,
  })
  assert.deepEqual(resolveAdminApiError('Neka sasvim nova poruka.', 'common.error', ''), {
    key: 'common.error',
    values: undefined,
  })
})

test('omotač resolveAdminApiErrorKey prosljeđuje kod (ne odbacuje ga tiho)', () => {
  // Ovo je rupa koja je stvarno postojala: omotač je imao samo (message, fallbackKey),
  // pa je treći argument spojen na pozivnim mjestima padao na pod.
  assert.equal(
    resolveAdminApiErrorKey(MSG_EMAIL_TAKEN, 'common.error', 'USERS_NOT_FOUND'),
    'users.errors.notFound',
  )
  assert.equal(resolveAdminApiErrorKey(MSG_EMAIL_TAKEN, 'common.error'), 'users.errors.emailTaken')
  assert.equal(resolveAdminApiErrorKey('Neka sasvim nova poruka.', 'common.error'), 'common.error')
})

test('profile i registracija takođe prevode po kodu', () => {
  assert.equal(
    resolveProfileApiErrorKey(MSG_EMAIL_VERIFIED, 'profile.errors.loadFailed', 'PROFILE_EMAIL_REQUIRED'),
    'profile.errors.emailRequired',
  )
  assert.equal(
    resolveProfileApiErrorKey(MSG_EMAIL_VERIFIED, 'profile.errors.loadFailed'),
    'profile.errors.emailAlreadyVerified',
  )
  assert.equal(
    getRegistrationErrorKey(MSG_EMAIL_TAKEN, 'USERS_USERNAME_TAKEN'),
    'users.errors.usernameTaken',
  )
  assert.equal(getRegistrationErrorKey(MSG_EMAIL_TAKEN), 'auth.emailAlreadyInUse')
  assert.equal(getRegistrationErrorKey(null, 'USERS_USERNAME_TAKEN'), 'users.errors.usernameTaken')
})

test('client i public resolver prihvataju SAMO kod svog imenskog prostora i skidaju prefiks', () => {
  assert.equal(
    API_ERROR_CODE_TO_KEY.MY_RESERVATIONS_SLOT_UNAVAILABLE,
    'public.myReservations.errorSlotUnavailable',
  )
  assert.deepEqual(resolveClientReservationError(MSG_SLOT_UNAVAILABLE, 'MY_RESERVATIONS_NOT_FOUND'), {
    key: 'errorNotFound',
  })
  assert.deepEqual(resolveClientReservationError(MSG_SLOT_UNAVAILABLE), { key: 'errorSlotUnavailable' })
  // Kod iz tuđeg imenskog prostora ne smije procuriti u public.myReservations.*
  assert.deepEqual(resolveClientReservationError(MSG_SLOT_UNAVAILABLE, 'RESERVE_SERVICE_UNAVAILABLE'), {
    key: 'errorSlotUnavailable',
  })
  assert.equal(resolveClientReservationError('Nepoznata poruka.', 'RESERVE_INVALID_DATE'), null)

  assert.equal(
    API_ERROR_CODE_TO_KEY.RESERVE_SERVICE_UNAVAILABLE,
    'public.reserve.errorServiceUnavailable',
  )
  assert.deepEqual(resolvePublicReservationError(MSG_SERVICE_NOT_FOUND, 'RESERVE_INVALID_DATE'), {
    key: 'errorInvalidDate',
  })
  assert.deepEqual(resolvePublicReservationError(MSG_SERVICE_NOT_FOUND), {
    key: 'errorServiceUnavailable',
  })
  assert.deepEqual(resolvePublicReservationError(MSG_SERVICE_NOT_FOUND, 'MY_RESERVATIONS_NOT_FOUND'), {
    key: 'errorServiceUnavailable',
  })
})
