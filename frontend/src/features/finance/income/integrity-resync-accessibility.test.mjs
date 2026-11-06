import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./integrity-panel.tsx', import.meta.url), 'utf8')

test('KIF resynchronization announces progress and marks its action busy', () => {
  assert.match(source, /aria-busy=\{isResyncing\}/)
  assert.match(source, /disabled=\{isResyncing\}/)
  assert.match(source, /isResyncing \? \([\s\S]*?role="status" aria-live="polite"[\s\S]*?finance\.states\.loading/)
})

test('the progress announcement is separate from the retryable integrity read error', () => {
  const loading = source.indexOf("if (isLoading)")
  const readError = source.indexOf("if (isError || !report)")
  const resyncStatus = source.indexOf("role=\"status\" aria-live=\"polite\"")
  assert.ok(loading >= 0 && readError > loading && resyncStatus > readError)
  assert.match(source, /if \(isError \|\| !report\) \{[\s\S]*?<ErrorState onRetry=\{onRetry\}/)
})
