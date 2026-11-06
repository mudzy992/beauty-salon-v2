import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/public/PublicBlogPost.tsx', import.meta.url), 'utf8')

test('public blog detail validates unknown API payloads against the route slug', () => {
  assert.match(source, /api\.get<unknown>\(/)
  assert.match(source, /parsePublicBlogPost\(data, slug\)/)
  assert.match(source, /if \(!validatedPost\) throw new Error\('Invalid public blog post response'\)/)
  assert.match(source, /encodeURIComponent\(slug\)/)
})

test('public blog detail ignores stale reads and invalidates in-flight work on cleanup', () => {
  assert.match(source, /const generation = \+\+postRequestGeneration\.current/)
  assert.match(source, /if \(generation !== postRequestGeneration\.current\) return/)
  assert.match(source, /postRequestGeneration\.current \+= 1/)
  assert.match(source, /finally \{\s*if \(generation === postRequestGeneration\.current\) setLoading\(false\)/)
})

test('public blog detail exposes loading and retryable read failure semantics', () => {
  assert.match(source, /role="status" aria-live="polite"[^>]*>[\s\S]*?common\.loading/)
  assert.match(source, /<div role="alert">[\s\S]*?public\.blogPost\.loadFailed[\s\S]*?onClick=\{loadPost\}/)
})
