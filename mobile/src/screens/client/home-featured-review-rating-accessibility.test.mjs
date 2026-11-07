import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./HomeScreen.tsx', import.meta.url), 'utf8')

test('featured review stars expose the localized numeric rating as one accessible label', () => {
  assert.match(resources, /featuredReviewRatingLabel: 'Ocjena usluge: \{\{rating\}\} od 5 zvjezdica\.'/)
  assert.match(
    screen,
    /<View\s+style=\{styles\.starRow\}\s+accessible\s+accessibilityLabel=\{t\('home\.featuredReviewRatingLabel',\s*\{\s*rating: featuredReview\.serviceRating,\s*\}\)\}/,
  )
  assert.match(screen, /i <= featuredReview\.serviceRating \? 'star' : 'star-outline'/)
})
