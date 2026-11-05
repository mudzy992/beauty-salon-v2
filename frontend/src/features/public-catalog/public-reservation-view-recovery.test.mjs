import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/public/PublicReservationView.tsx', import.meta.url), 'utf8')
const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)
const hasKey = (resource, key) => key.split('.').reduce((value, part) => value?.[part], resource) !== undefined

test('token reservation view validates API payload and separates unavailable links from read failures', () => {
  assert.match(source, /const isPublicReservationPayload = \(value: unknown\)/)
  assert.match(source, /if \(!isPublicReservationPayload\(response\.data\)\)/)
  assert.match(source, /status === 404 \|\| status === 410 \? 'notFound' : 'loadFailed'/)
  assert.match(source, /error === 'loadFailed'/)
  for (const locale of locales) {
    assert.ok(hasKey(locale, 'public.reservationView.invalidLink'))
    assert.ok(hasKey(locale, 'public.reservationView.notFound'))
    assert.ok(hasKey(locale, 'public.reservationView.loadFailed'))
  }
})

test('token reservation loading and errors have accessible announcements and retry', () => {
  assert.match(source, /role="status" aria-live="polite"[\s\S]*?common\.loading/)
  assert.match(source, /role="alert"[\s\S]*?public\.reservationView\.\$\{error\}/)
  assert.match(source, /error === 'loadFailed'[\s\S]*?onClick=\{\(\) => void load\(\)\}[\s\S]*?common\.retry/)
})

test('token changes and unmounts invalidate stale reservation responses', () => {
  assert.match(source, /const requestId = \+\+requestIdRef\.current/)
  assert.equal((source.match(/requestId === requestIdRef\.current/g) ?? []).length, 3)
  assert.match(source, /return \(\) => \{\s*requestIdRef\.current \+= 1/)
})
