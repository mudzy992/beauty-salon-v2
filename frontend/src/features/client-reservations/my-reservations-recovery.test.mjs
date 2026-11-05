import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/public/MyReservations.tsx', import.meta.url), 'utf8')
const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL(`../../i18n/locales/${language}.json`, import.meta.url), 'utf8')),
)
const hasKey = (resource, key) => key.split('.').reduce((value, part) => value?.[part], resource) !== undefined

test('reservation load failures remain distinct from valid empty history', () => {
  assert.match(source, /setLoadError\(true\)/)
  assert.match(source, /public\.myReservations\.loadFailed/)
  assert.match(source, /public\.myReservations\.noUpcoming/)
  assert.match(source, /public\.myReservations\.noPast/)
  assert.doesNotMatch(source, /setItems\(\[\]\)/)
  for (const locale of locales) {
    assert.ok(hasKey(locale, 'public.myReservations.loadFailed'))
    assert.ok(hasKey(locale, 'public.myReservations.noUpcoming'))
    assert.ok(hasKey(locale, 'public.myReservations.noPast'))
  }
})

test('history loading and failures have announced status and a retry action', () => {
  assert.match(source, /role="status" aria-live="polite"[\s\S]*?common\.loading/)
  assert.match(source, /role="alert"[\s\S]*?public\.myReservations\.loadFailed[\s\S]*?onClick=\{\(\) => void load\(\)\}[\s\S]*?common\.retry/)
})

test('overlapping or unmounted history requests cannot overwrite current state', () => {
  assert.match(source, /const requestId = \+\+requestIdRef\.current/)
  assert.equal((source.match(/requestId === requestIdRef\.current/g) ?? []).length, 3)
  assert.match(source, /return \(\) => \{\s*requestIdRef\.current \+= 1/)
})
