import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const screen = readFileSync(new URL('./ProfileScreen.tsx', import.meta.url), 'utf8')

test('profile debt and media-consent reads preserve same-user data after failure', () => {
  assert.match(screen, /normalizeProfileDebts\(data\)/)
  assert.match(screen, /normalizeConsentPayload\(data\)/)
  assert.match(screen, /catch \{\s*if \(generation === debtsGeneration\.current\) setOpenDebtsError\(true\);\s*\}/)
  assert.match(screen, /catch \{\s*if \(generation === mediaConsentGeneration\.current\) setMediaConsentError\(true\);\s*return false;\s*\}/)
  assert.doesNotMatch(screen, /catch \{\s*setOpenDebts\(\[\]\);/)
  assert.doesNotMatch(screen, /catch \{\s*setMediaConsent\(null\);/)
  assert.match(screen, /openDebtsLoaded && openDebtsOwnerId === userId\s*\? t\('profile\.debtStale'\)/)
  assert.match(screen, /mediaConsentLoaded && mediaConsentOwnerId === userId\s*\? t\('profile\.mediaConsent\.stale'\)/)
})

test('profile recovery offers retry and isolates data and late responses by user', () => {
  assert.match(screen, /const requestOwnerId = useRef\(userId\)/)
  assert.match(screen, /requestOwnerId\.current = userId;\s*mediaConsentGeneration\.current \+= 1;\s*debtsGeneration\.current \+= 1/)
  assert.match(screen, /const visibleOpenDebts = openDebtsOwnerId === userId \? openDebts : \[\]/)
  assert.match(screen, /const visibleMediaConsent = mediaConsentOwnerId === userId \? mediaConsent : null/)
  assert.match(screen, /setMediaConsentRetryCount\(\(count\) => count \+ 1\)/)
  assert.match(screen, /setOpenDebtsRetryCount\(\(count\) => count \+ 1\)/)
  assert.match(screen, /mediaConsentGeneration\.current \+= 1/)
  assert.match(screen, /debtsGeneration\.current \+= 1/)
})
