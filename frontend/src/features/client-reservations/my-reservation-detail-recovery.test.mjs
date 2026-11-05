import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/public/MyReservationDetail.tsx', import.meta.url), 'utf8')
const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL(`../../i18n/locales/${language}.json`, import.meta.url), 'utf8')),
)
const hasKey = (resource, key) => key.split('.').reduce((value, part) => value?.[part], resource) !== undefined

test('reservation detail distinguishes unavailable records from read failures', () => {
  assert.match(source, /const unavailable = status === 403 \|\| status === 404/)
  assert.match(source, /setNotFound\(unavailable\)/)
  assert.match(source, /setLoadError\(!unavailable\)/)
  assert.match(source, /public\.myReservations\.notFound/)
  assert.match(source, /public\.myReservations\.detailLoadFailed/)
  assert.match(source, /data\.id !== id/)
  for (const locale of locales) {
    assert.ok(hasKey(locale, 'public.myReservations.detailLoadFailed'))
    assert.ok(hasKey(locale, 'public.myReservations.notFound'))
  }
})

test('detail loading is announced and transient failures offer localized retry', () => {
  assert.match(source, /role="status" aria-live="polite"[\s\S]*?common\.loading/)
  assert.match(source, /role="alert"[\s\S]*?public\.myReservations\.detailLoadFailed[\s\S]*?onClick=\{\(\) => void load\(\)\}[\s\S]*?common\.retry/)
})

test('route changes and unmounts invalidate stale detail responses', () => {
  assert.match(source, /const requestId = \+\+requestIdRef\.current/)
  assert.equal((source.match(/requestId === requestIdRef\.current/g) ?? []).length, 3)
  assert.match(source, /return \(\) => \{\s*requestIdRef\.current \+= 1/)
})
