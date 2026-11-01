import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const hook = readFileSync(new URL('./reservation-detail/hooks/use-stylist-reservation-detail.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./StylistReservationDetailScreen.tsx', import.meta.url), 'utf8')

test('stylist reservation detail validates response identity and distinguishes not-found from read errors', () => {
  assert.match(hook, /api\.get<unknown>\(`/)
  assert.match(hook, /normalizeReservationDetail\(data\)/)
  assert.match(hook, /if \(!parsed \|\| parsed\.id !== reservationId\) \{\s*if \(isCurrentRequest\(\)\) \{\s*setLoadError\(true\);/)
  assert.match(hook, /const \[loadError, setLoadError\] = useState\(false\)/)
  assert.match(hook, /const \[notFound, setNotFound\] = useState\(false\)/)
  assert.match(hook, /if \(status === 404\) \{\s*setReservation\(null\);\s*reservationIdentityRef\.current = null;\s*setReservationIdentity\(null\);\s*setNotFound\(true\);\s*\} else \{\s*setLoadError\(true\);\s*\}/)
  assert.match(hook, /requestGeneration\.current/)
  assert.match(hook, /reservation: reservationMatchesCurrent \? reservation : null/)
  assert.match(hook, /generation === requestGeneration\.current && isCurrent\(\)/)
  assert.match(screen, /loadError\s*\?\s*t\('reservationDetail\.loadErrorMessage'\)/)
  assert.match(screen, /loadError && !notFound[\s\S]*?fetchReservation\(\)[\s\S]*?loading=\{retrying\}/)
  assert.match(screen, /loadError \? \(/)
  assert.match(screen, /reservationDetail\.staleMessage/)
  assert.match(screen, /onPress=\{\(\) => void fetchReservation\(\)\}/)
})
