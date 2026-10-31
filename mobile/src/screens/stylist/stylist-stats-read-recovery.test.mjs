import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const screen = readFileSync(new URL('./StylistStatsScreen.tsx', import.meta.url), 'utf8')

test('stylist statistics reads fail independently and preserve valid prior values', () => {
  assert.match(screen, /const loadReservations = async \(\) => \{/)
  assert.match(screen, /const loadDailyLog = async \(\) => \{/)
  assert.match(screen, /normalizeReservations\(data\)/)
  assert.match(screen, /normalizeDailyLogEntries\(data\)/)
  assert.match(screen, /parsed\.length !== data\.length/)
  assert.match(screen, /setReservations\(parsed\);\s*setReservationsLoaded\(true\);\s*setReservationsOwnerId\(profileId\);\s*setReservationsError\(false\)/)
  assert.match(screen, /setDailyLog\(parsed\);\s*setDailyLogLoaded\(true\);\s*setDailyLogOwnerId\(profileId\);\s*setDailyLogError\(false\)/)
  assert.match(screen, /catch \{\s*if \(generation === requestGeneration\.current\) setReservationsError\(true\);\s*\}/)
  assert.match(screen, /catch \{\s*if \(generation === requestGeneration\.current\) setDailyLogError\(true\);\s*\}/)
  assert.match(screen, /await Promise\.all\(\[loadReservations\(\), loadDailyLog\(\)\]\)/)
  assert.doesNotMatch(screen, /catch\s*\{\s*setReservations\(\[\]\);\s*setDailyLog\(\[\]\);/)
})

test('statistics distinguish unknown or stale values and provide accessible retry', () => {
  assert.match(screen, /const requestGeneration = useRef\(0\)/)
  assert.match(screen, /generation !== requestGeneration\.current/)
  assert.match(screen, /requestGeneration\.current \+= 1;[\s\S]*?return \(\) => \{\s*requestGeneration\.current \+= 1;/)
  assert.match(screen, /hasReservationsData = reservationsLoaded && reservationsOwnerId === profileId/)
  assert.match(screen, /hasDailyLogData = dailyLogLoaded && dailyLogOwnerId === profileId/)
  assert.match(screen, /hasReservationsData \? completedReservations\.length : '—'/)
  assert.match(screen, /hasReservationsData \? confirmedUpcoming\.length : '—'/)
  assert.match(screen, /hasDailyLogData \? `\$\{totalRevenue\.toFixed\(2\)\} KM` : '—'/)
  assert.match(screen, /stylist\.stats\.reservationsLoadError/)
  assert.match(screen, /stylist\.stats\.reservationsStale/)
  assert.match(screen, /stylist\.stats\.dailyLogLoadError/)
  assert.match(screen, /stylist\.stats\.dailyLogStale/)
  assert.match(screen, /accessibilityRole="button"[\s\S]*?accessibilityLabel=\{t\('stylist\.stats\.retry'\)\}/)
})
