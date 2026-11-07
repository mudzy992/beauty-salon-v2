import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./ServiceSingleDetailScreen.tsx', import.meta.url), 'utf8')
const rating = screen.match(/<View\s+accessible\s+accessibilityRole="image"([\s\S]*?)>\s*\{\[1, 2, 3, 4, 5\]/)?.[1]

test('each service review rating is announced as a localized score rather than separate stars', () => {
  assert.match(resources, /ratingOption: '\{\{category\}\}: \{\{rating\}\} od \{\{total\}\} zvjezdica'/)
  assert.ok(rating, 'Review rating group should exist')
  assert.match(rating, /accessibilityLabel=\{t\('reviews\.ratingOption'/)
  assert.match(rating, /category: t\('reviews\.serviceRating'\)/)
  assert.match(rating, /rating: r\.serviceRating \|\| 0/)
  assert.match(rating, /total: 5/)
  assert.match(rating, /style=\{styles\.starsRow\}/)
  assert.match(screen, /star <= \(r\.serviceRating \|\| 0\)/)
})
