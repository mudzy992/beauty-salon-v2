import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const hook = readFileSync(new URL('./useStylistProfile.ts', import.meta.url), 'utf8')
const consumers = [
  '../screens/stylist/StylistScheduleScreen.tsx',
  '../screens/stylist/DailyLogListScreen.tsx',
  '../screens/stylist/DailyLogNewEntryScreen.tsx',
  '../screens/stylist/StylistStatsScreen.tsx',
  '../screens/stylist/StylistInboxScreen.tsx',
  '../screens/stylist/StylistReservationDetailScreen.tsx',
].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'))

test('stylist profile lookup validates unknown payloads and isolates late responses by account', () => {
  assert.match(hook, /api\.get<unknown>\('\/api\/stylists\/me'\)/)
  assert.match(hook, /api\.get<unknown>\('\/api\/users\/profile'\)/)
  assert.match(hook, /if \(!payload \|\| typeof payload !== 'object' \|\| Array\.isArray\(payload\)\) return null/)
  assert.match(hook, /function isOwnedByUser\(profile: unknown, userId: string\): profile is StylistProfile/)
  assert.match(hook, /typeof ownerId === 'string' && ownerId === userId/)
  assert.match(hook, /parsed && isOwnedByUser\(parsed, currentUserId\)/)
  assert.match(hook, /userIdFromProfile !== currentUserId/)
  assert.match(hook, /encodeURIComponent\(currentUserId\)/)
  assert.match(hook, /!parsedByUser \|\| !isOwnedByUser\(parsedByUser, currentUserId\)/)
  assert.match(hook, /requestGeneration\.current === generation/)
  assert.match(hook, /useAuthStore\.getState\(\)\.user\?\.id === currentUserId/)
  assert.match(hook, /profileOwnerUserId === userId \? profile : null/)
  assert.match(hook, /catch \(error: unknown\)[\s\S]*?if \(isMissingStylistProfile\(error\)\)[\s\S]*?setLoadError\(false\)[\s\S]*?else \{\s*setLoadError\(true\)/)
  assert.match(hook, /response\?\.status === 404/)
  assert.match(hook, /loadError,\s*refetch: fetchProfile/)
})

test('profile lookup failures expose a retry action instead of a not-found empty state', () => {
  for (const screen of consumers) {
    assert.match(screen, /loadError: profileLoadError/)
    assert.match(screen, /t\('stylist\.profile\.profileLoadError'\)/)
    assert.match(screen, /retryProfileLoad/)
    assert.match(screen, /refetchProfile\(\)/)
  }
})
