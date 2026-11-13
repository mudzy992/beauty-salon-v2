import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./data-state.tsx', import.meta.url), 'utf8')

test('finance table skeleton announces loading and hides decorative skeleton cells', () => {
  assert.match(source, /<div role="status" aria-live="polite" data-admin-state="loading" className="space-y-2">/)
  assert.match(source, /<span className="sr-only">\{t\('finance\.states\.loading'\)\}<\/span>/)
  assert.match(source, /<div aria-hidden="true" className="space-y-2">/)
  assert.match(source, /Array\.from\(\{ length: rows \}\)/)
  assert.match(source, /Array\.from\(\{ length: columns \}\)/)
})

test('finance read errors remain alert regions with an explicit retry action', () => {
  const errorState = source.slice(source.indexOf('export function ErrorState'))
  assert.match(errorState, /role="alert"/)
  assert.match(errorState, /\{onRetry \? \(/)
  assert.match(errorState, /onClick=\{onRetry\}/)
  assert.match(errorState, /finance\.states\.retry/)
})


test('shared admin data states expose stable scoped styling hooks and reduced-motion skeletons', () => {
  for (const state of ['loading', 'empty', 'error']) assert.ok(source.includes(`data-admin-state="${state}"`))
  assert.match(source, /data-admin-skeleton-cell/ )
  assert.match(source, /motion-reduce:animate-none/)
})
