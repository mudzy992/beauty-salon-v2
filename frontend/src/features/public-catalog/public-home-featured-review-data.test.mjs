import assert from 'node:assert/strict'
import test from 'node:test'

import { parsePublicHomeFeaturedReview } from './public-home-featured-review-data.mjs'

const review = {
  id: 'review-1',
  serviceRating: 5,
  stylistRating: 4,
  comment: 'Odlična usluga.',
  user: { firstName: 'Amina', lastName: 'K.', avatar: null },
  service: { name: 'Šišanje' },
}

test('featured review parser accepts a valid public review', () => {
  assert.deepEqual(parsePublicHomeFeaturedReview(review), review)
})

test('featured review parser preserves null as a valid no-review result', () => {
  assert.equal(parsePublicHomeFeaturedReview(null), null)
})

test('featured review parser rejects malformed ratings and nested display data', () => {
  assert.equal(parsePublicHomeFeaturedReview({ ...review, serviceRating: 8 }), undefined)
  assert.equal(
    parsePublicHomeFeaturedReview({ ...review, user: { firstName: 12, lastName: null } }),
    undefined,
  )
  assert.equal(parsePublicHomeFeaturedReview({ ...review, service: {} }), undefined)
  assert.equal(parsePublicHomeFeaturedReview([]), undefined)
})
