import assert from 'node:assert/strict'
import test from 'node:test'

import { parsePublicBlogComments } from './public-blog-comments-data.mjs'

const comment = {
  id: 'comment-1',
  content: 'Bilo je odlično.',
  createdAt: '2026-11-05T10:00:00.000Z',
  user: { firstName: 'Amina', lastName: 'K.' },
}
const page = {
  items: [comment],
  total: 3,
  limit: 20,
  offset: 0,
  hasMore: true,
  nextOffset: 1,
}

test('public comments parser accepts consistent paginated responses', () => {
  assert.deepEqual(parsePublicBlogComments(page, 20, 0), page)
})

test('public comments parser keeps legacy arrays compatible and bounded', () => {
  assert.deepEqual(parsePublicBlogComments([comment], 20, 20), {
    items: [comment],
    total: 1,
    limit: 20,
    offset: 20,
    hasMore: false,
    nextOffset: 21,
  })
})

test('public comments parser rejects malformed rows and inconsistent paging metadata', () => {
  assert.equal(parsePublicBlogComments([{ ...comment, user: null }], 20, 0), null)
  assert.equal(parsePublicBlogComments([{ ...comment, createdAt: 'invalid' }], 20, 0), null)
  assert.equal(parsePublicBlogComments({ ...page, nextOffset: 2 }, 20, 0), null)
  assert.equal(parsePublicBlogComments({ ...page, offset: 20 }, 20, 0), null)
  assert.equal(parsePublicBlogComments({ ...page, hasMore: true, items: [] }, 20, 0), null)
})
