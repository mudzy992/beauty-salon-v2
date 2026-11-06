import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/public/PublicHome.tsx', import.meta.url), 'utf8')

test('featured review reads validate unknown response data and preserve the empty result', () => {
  assert.match(source, /api\.get<unknown>\('\/api\/reviews\/featured\/random'\)/)
  assert.match(source, /parsePublicHomeFeaturedReview\(data\)/)
  assert.match(source, /if \(review === undefined\) throw new Error\('Invalid featured review response'\)/)
  assert.match(source, /setFeaturedReview\(review\)/)
})

test('featured review reads ignore stale and unmounted requests', () => {
  assert.match(source, /const generation = \+\+featuredReviewRequestGeneration\.current/)
  assert.match(source, /if \(generation !== featuredReviewRequestGeneration\.current\) return/)
  assert.match(source, /featuredReviewRequestGeneration\.current \+= 1/)
  assert.match(source, /if \(generation === featuredReviewRequestGeneration\.current\) \{\s*setFeaturedReviewLoading\(false\)/)
})

test('featured review retries retain prior valid content when a read fails', () => {
  const loadBlock = source.match(/const loadFeaturedReview = useCallback\(async \(\) => \{([\s\S]*?)\}, \[\]\)/)
  assert.ok(loadBlock)
  const catchBlock = loadBlock[1].match(/catch \{([\s\S]*?)\n    \} finally/)
  assert.ok(catchBlock)
  assert.doesNotMatch(catchBlock[1], /setFeaturedReview\(/)
  assert.match(source, /featuredReviewLoadError \? \([\s\S]*?role="alert"[\s\S]*?loadFeaturedReview\(\)/)
  assert.match(source, /\{featuredReview \? \([\s\S]*?featuredReview\.service\?\.name/)
})

test('featured review read is feature-gated and loading has an independent live region', () => {
  assert.match(source, /if \(!reviewsOn\) return\s*void loadFeaturedReview\(\)/)
  assert.match(source, /role="status" aria-live="polite"[^>]*>[\s\S]*?common\.loading/)
  assert.match(source, /section aria-labelledby="homepage-featured-review-heading"/)
})
