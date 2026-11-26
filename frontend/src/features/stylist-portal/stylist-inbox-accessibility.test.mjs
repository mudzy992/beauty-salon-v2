import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

// S10 (2026-11-18): inbox je podijeljen na stranicu + hook + karticu
// rezervacije. Tvrdnje su **nepromijenjene** — iste provjere, samo nad
// agregiranim izvorom umjesto nad jednim monolitnim fajlom.
const HERE = dirname(fileURLToPath(import.meta.url))
const read = (rel) => readFileSync(resolve(HERE, rel), 'utf8')

const page = read('pages/stylist-inbox-page.tsx')
const card = read('components/inbox-reservation-card.tsx')
const source = [page, card].join('\n')

test('stylist inbox profile and list loading states are announced separately from empty results', () => {
  assert.match(page, /if \(profileLoading\) \{[\s\S]*?role="status" aria-live="polite"[\s\S]*?t\('common\.loading'\)/)
  assert.match(page, /isFetching \? \([\s\S]*?role="status" aria-live="polite"[\s\S]*?t\('common\.loading'\)/)
  assert.match(page, /const empty = !isLoading && !error && pending\.length === 0/)
})

test('inbox refresh exposes busy state while retaining a separate retryable error alert', () => {
  assert.match(page, /onClick=\{\(\) => refetch\(\)\}[\s\S]*?disabled=\{isFetching\}[\s\S]*?aria-busy=\{isFetching\}/)
  assert.match(page, /error \? \([\s\S]*?role="alert"[\s\S]*?void refetch\(\)/)
})

test('inbox reservation actions announce pending work and expose busy state', () => {
  // Status „u toku" i sva četiri dugmeta (zaključaj / prihvati / otključaj /
  // odbij) preselila su se u karticu rezervacije — broj `aria-busy` je isti.
  assert.match(card, /acting \? \([\s\S]*?role="status" aria-live="polite"[\s\S]*?t\('common\.loading'\)/)
  assert.equal((card.match(/aria-busy=\{acting\}/g) ?? []).length, 4)
})
