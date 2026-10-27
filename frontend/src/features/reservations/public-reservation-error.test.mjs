import assert from 'node:assert/strict'
import test from 'node:test'

import { resolvePublicReservationError } from './public-reservation-error.mjs'

test('maps reservation service, slot, and idempotency errors to locale keys', () => {
  assert.deepEqual(resolvePublicReservationError('SERVICE_REQUIRED'), {
    key: 'errorServiceRequired',
  })
  assert.deepEqual(resolvePublicReservationError('SERVICE_GENDER_MISMATCH'), {
    key: 'errorServiceGenderMismatch',
  })
  assert.deepEqual(resolvePublicReservationError('Odabrani termin nije dostupan.'), {
    key: 'errorSlotUnavailable',
  })
  assert.deepEqual(
    resolvePublicReservationError('Idempotency-Key je već korišten za drugačiji zahtjev.'),
    { key: 'errorRequestKeyConflict' },
  )
})

test('preserves dynamic booking details and rejects unknown or malformed errors', () => {
  assert.deepEqual(
    resolvePublicReservationError('Već imate rezervaciju u tom periodu (09:00–10:30).'),
    { key: 'errorExistingPeriod', values: { start: '09:00', end: '10:30' } },
  )
  assert.deepEqual(
    resolvePublicReservationError('Već imate rezervaciju za Šišanje na odabrani dan.'),
    { key: 'errorExistingService', values: { service: 'Šišanje' } },
  )
  assert.deepEqual(
    resolvePublicReservationError(
      'Zbog čestih otkazivanja rezervacija je onemogućena do 2026-12-05.',
    ),
    { key: 'errorPenaltyUntil', values: { date: '2026-12-05' } },
  )
  assert.equal(resolvePublicReservationError('unknown server message'), null)
  assert.equal(resolvePublicReservationError(['malformed', 'response']), null)
  assert.equal(resolvePublicReservationError(undefined), null)
})
