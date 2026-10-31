import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const hook = readFileSync(new URL('./reservation-detail/hooks/use-reservation-detail-status.ts', import.meta.url), 'utf8')
const actions = readFileSync(new URL('./reservation-detail/reservation-detail-actions.tsx', import.meta.url), 'utf8')

test('start-order helper rejects malformed reservation lists and keeps start blocked on read failures', () => {
  assert.match(hook, /api\.get<unknown>\('\/api\/reservations'/)
  assert.match(hook, /const list = normalizeReservations\(data\)/)
  assert.match(hook, /!Array\.isArray\(data\) \|\| !list \|\| list\.length !== data\.length/)
  assert.match(hook, /setCheckState\(t\('stylist\.reservationDetail\.actions\.startOrderCheckError'\), true\)/)
  assert.match(hook, /catch \{\s*setCheckState\(t\('stylist\.reservationDetail\.actions\.startOrderCheckError'\), true\);\s*\}/)
  assert.match(hook, /retryStartOrderCheck = useCallback\(\(\) => setTimeTick/)
})

test('reservation start remains disabled until the check succeeds or reports no earlier pending appointment', () => {
  assert.match(actions, /disabled=\{!!startBlockedReason\}/)
  assert.match(actions, /canStart && startOrderCheckError/)
  assert.match(actions, /onPress=\{retryStartOrderCheck\}/)
  assert.match(actions, /loading=\{startOrderCheckLoading\}/)
})
