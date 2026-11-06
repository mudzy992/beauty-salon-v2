import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/public/PublicSatisfiedClients.tsx', import.meta.url), 'utf8')

test('satisfied clients page validates unknown API payloads against page size and offset', () => {
  assert.match(source, /api\.get<unknown>\('\/api\/daily-log\/before-after'/)
  assert.match(source, /parsePublicSatisfiedClientsPage\(data, PAGE_SIZE, nextOffset\)/)
  assert.match(source, /if \(!page\) throw new Error\('Invalid public satisfied-clients response'\)/)
})

test('satisfied clients page prevents concurrent reads and ignores stale/unmounted results', () => {
  assert.match(source, /if \(!isMounted\.current \|\| requestInFlight\.current\) return/)
  assert.match(source, /const generation = \+\+requestGeneration\.current/)
  assert.match(source, /if \(generation !== requestGeneration\.current\) return/)
  assert.match(source, /requestGeneration\.current \+= 1/)
  assert.match(source, /isMounted\.current = false/)
})

test('satisfied clients page retains prior rows and retries the failed offset', () => {
  assert.doesNotMatch(source, /setItems\(\[\]\)/)
  assert.match(source, /loadError \? \([\s\S]*?role="alert"[\s\S]*?loadPage\(offset, items\.length > 0\)/)
})

test('satisfied clients page announces loading and provides keyboard-operable pagination', () => {
  assert.match(source, /role="status" aria-live="polite"[^>]*>[\s\S]*?public\.satisfiedClients\.loading/)
  assert.match(source, /role="status" aria-live="polite" className="sr-only">\s*\{t\('public\.satisfiedClients\.loadingMore'\)\}/)
  assert.match(source, /public\.satisfiedClients\.loadMore/)
  assert.match(source, /typeof IntersectionObserver === 'undefined'/)
})

test('back-home action is a single styled link rather than a nested button', () => {
  assert.match(source, /<Button asChild variant="outline">\s*<Link to="\/">\{t\('public\.satisfiedClients\.backHome'\)\}<\/Link>\s*<\/Button>/)
  assert.doesNotMatch(source, /<Link[^>]*>[\s\S]*?<Button/)
})
