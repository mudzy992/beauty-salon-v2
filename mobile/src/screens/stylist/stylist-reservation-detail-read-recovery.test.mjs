import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const hook = readFileSync(new URL('./reservation-detail/hooks/use-stylist-reservation-detail.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./StylistReservationDetailScreen.tsx', import.meta.url), 'utf8')

test('stylist reservation detail distinguishes not-found from read errors and preserves stale data', () => {
  assert.match(hook, /const \[loadError, setLoadError\] = useState\(false\)/)
  assert.match(hook, /const \[notFound, setNotFound\] = useState\(false\)/)
  assert.match(hook, /if \(status === 404\) \{\s*setReservation\(null\);\s*setNotFound\(true\);\s*\} else \{\s*setLoadError\(true\);\s*\}/)
  assert.match(hook, /requestGeneration\.current/)
  assert.match(screen, /loadError\s*\?\s*t\('reservationDetail\.loadErrorMessage'\)/)
  assert.match(screen, /loadError && !notFound[\s\S]*?fetchReservation\(\)[\s\S]*?loading=\{retrying\}/)
  assert.match(screen, /loadError \? \(/)
  assert.match(screen, /reservationDetail\.staleMessage/)
  assert.match(screen, /onPress=\{\(\) => void fetchReservation\(\)\}/)
})
