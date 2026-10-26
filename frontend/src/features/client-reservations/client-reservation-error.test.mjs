import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveClientReservationError } from './client-reservation-error.mjs'

test('maps known client reservation action errors to translation keys', () => {
  assert.deepEqual(resolveClientReservationError('Rok za otkazivanje je istekao.'), {
    key: 'errorCancelDeadline',
  })
  assert.deepEqual(
    resolveClientReservationError('Nema aktivnog zahtjeva za potvrdu termina.'),
    { key: 'errorNoRescheduleRequest' },
  )
  assert.deepEqual(
    resolveClientReservationError(
      'Rok za potvrdu dolaska je istekao (najkasnije 12h prije termina).',
    ),
    { key: 'errorAttendanceDeadline', values: { hours: '12' } },
  )
  assert.equal(resolveClientReservationError('unknown server error'), null)
  assert.equal(resolveClientReservationError(undefined), null)
})
