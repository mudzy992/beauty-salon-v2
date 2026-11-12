import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const pageSource = readFileSync(new URL('../../pages/public/PublicHome.tsx', import.meta.url), 'utf8')
const spotlightSource = readFileSync(new URL('../shell/public/before-after-spotlight.tsx', import.meta.url), 'utf8')

test('homepage before/after reads validate unknown payloads before storing results', () => {
  assert.match(pageSource, /api\.get<unknown>\([\s\S]*?\/api\/daily-log\/before-after/)
  assert.match(pageSource, /parsePublicHomeBeforeAfter\(data\)/)
  assert.match(pageSource, /if \(!items\) throw new Error\('Invalid public before\/after response'\)/)
})

test('homepage before/after reads ignore stale requests and unmount completions', () => {
  assert.match(pageSource, /const generation = \+\+beforeAfterRequestGeneration\.current/)
  assert.match(pageSource, /if \(generation !== beforeAfterRequestGeneration\.current\) return/)
  assert.match(pageSource, /beforeAfterRequestGeneration\.current \+= 1/)
  assert.match(pageSource, /if \(generation === beforeAfterRequestGeneration\.current\) \{\s*setBeforeAfterLoading\(false\)/)
})

test('homepage retries retain the last valid pairs while surfacing the read failure', () => {
  assert.doesNotMatch(pageSource, /setBeforeAfterPairs\(\[\]\)/)
  assert.match(pageSource, /beforeAfterLoadError \? \([\s\S]*?role="alert"[\s\S]*?onClick=\{\(\) => void loadBeforeAfter\(\)\}/)
  assert.match(pageSource, /!beforeAfterLoadError \|\| beforeAfterPairs\.length > 0/)
})

test('shared before/after spotlight announces loading accessibly', () => {
  assert.match(spotlightSource, /role="status" aria-live="polite"[^>]*>[\s\S]*?public\.beforeAfter\.loading/)
})

test('spotlight rails do not auto-move or duplicate focusable thumbnails', () => {
  assert.doesNotMatch(spotlightSource, /repeat:\s*Infinity|\[\.\.\.items,\s*\.\.\.items\]/)
  assert.match(spotlightSource, /overflow-y-auto/)
  assert.match(spotlightSource, /items\.map\(\(row\)/)
  assert.match(spotlightSource, /onClick=\{\(\) => onSelect\(row\.index\)\}/)
})
