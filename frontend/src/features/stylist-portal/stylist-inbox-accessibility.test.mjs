import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./pages/stylist-inbox-page.tsx', import.meta.url), 'utf8')

test('stylist inbox profile and list loading states are announced separately from empty results', () => {
  assert.match(source, /if \(profileLoading\) \{[\s\S]*?role="status" aria-live="polite"[\s\S]*?t\('common\.loading'\)/)
  assert.match(source, /isFetching \? \([\s\S]*?role="status" aria-live="polite"[\s\S]*?t\('common\.loading'\)/)
  assert.match(source, /const empty = !isLoading && !error && pending\.length === 0/)
})

test('inbox refresh exposes busy state while retaining a separate retryable error alert', () => {
  assert.match(source, /onClick=\{\(\) => refetch\(\)\}[\s\S]*?disabled=\{isFetching\}[\s\S]*?aria-busy=\{isFetching\}/)
  assert.match(source, /error \? \([\s\S]*?role="alert"[\s\S]*?void refetch\(\)/)
})
