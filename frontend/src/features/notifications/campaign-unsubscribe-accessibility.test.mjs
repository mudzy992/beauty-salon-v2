import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/public/CampaignUnsubscribe.tsx', import.meta.url), 'utf8')

test('campaign unsubscribe resets and invalidates requests when the query token changes', () => {
  assert.match(source, /useEffect\(\(\) => \{\s*requestGeneration\.current \+= 1;\s*requestInFlight\.current = false;\s*setStatus\(token \? "confirm" : "invalid"\)/)
  assert.match(source, /requestGeneration\.current \+= 1;\s*requestInFlight\.current = false;\s*\};\s*\}, \[token\]\)/)
})

test('campaign unsubscribe prevents duplicate requests and uses only the submitted token', () => {
  assert.match(source, /if \(requestInFlight\.current\) return/)
  assert.match(source, /const submittedToken = token/)
  assert.match(source, /api\.post<unknown>\([\s\S]*?\{ token: submittedToken \}/)
  assert.match(source, /if \(generation !== requestGeneration\.current\) return/)
})

test('campaign unsubscribe validates the mutation response and preserves retryable failure states', () => {
  assert.match(source, /isSuccessfulCampaignUnsubscribeResponse\(data\)/)
  assert.match(source, /responseStatus === 400 \? "invalid" : "failed"/)
  assert.match(source, /status === "failed" \? \([\s\S]*?campaignUnsubscribe\.retry/)
})

test('campaign unsubscribe announces state changes and exposes submission busy state', () => {
  assert.match(source, /role=\{isErrorStatus \? "alert" : "status"\}/)
  assert.match(source, /aria-live=\{isErrorStatus \? "assertive" : "polite"\}/)
  assert.match(source, /aria-busy=\{status === "submitting"\}/)
  assert.match(source, /<Loader2[^>]*aria-hidden="true" \/>/)
})


test('unsubscribe uses the public shell main landmark', () => {
  assert.match(source, /<div data-aurum-page="unsubscribe"/)
  assert.doesNotMatch(source, /<main\b/)
})
