import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const screen = readFileSync(new URL('./ServicesScreen.tsx', import.meta.url), 'utf8')

test('personalized and popular service reads have separate retryable error states', () => {
  assert.match(screen, /api\.get<unknown>\('\/api\/reservations'[\s\S]*?normalizeReservations\(data\)[\s\S]*?setReservationsError\(true\)/)
  assert.match(screen, /api\.get<unknown>\('\/api\/services\/popular'[\s\S]*?normalizePopularService\(data\)[\s\S]*?setPopularServiceError\(true\)/)
  assert.match(screen, /if \(payload === null\) return null/)
  assert.match(screen, /if \(normalized === undefined\) throw new Error\(\)/)
  assert.match(screen, /onPress=\{\(\) => void fetchReservations\(\)\}[\s\S]*?loading=\{reservationsRetrying\}/)
  assert.match(screen, /onPress=\{\(\) => void fetchPopularService\(\)\}[\s\S]*?loading=\{popularServiceRetrying\}/)
  assert.match(screen, /setReservations\(normalized\)/)
  assert.match(screen, /setPopularService\(normalized\)/)
  assert.doesNotMatch(screen, /api\.get<Reservation\[]>\('\/api\/reservations'[\s\S]*?catch\(\(\) => null\)/)
  assert.doesNotMatch(screen, /api\.get<PopularService \| null>\('\/api\/services\/popular'[\s\S]*?catch\(\(\) => null\)/)
})
