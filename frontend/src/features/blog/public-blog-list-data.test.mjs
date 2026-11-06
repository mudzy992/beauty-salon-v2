import assert from 'node:assert/strict'
import test from 'node:test'

import { parsePublicBlogListPage } from './public-blog-list-data.mjs'

const post = {
  id: 'post-1',
  title: 'Frizura',
  slug: 'frizura',
  excerpt: null,
  isPublished: true,
  publishedAt: '2026-11-05T10:00:00.000Z',
  createdAt: '2026-11-01T09:00:00.000Z',
  heroImage: null,
}

test('public blog parser accepts coherent paginated responses', () => {
  const page = parsePublicBlogListPage(
    {
      items: [post],
      total: 2,
      limit: 20,
      offset: 0,
      hasMore: true,
      nextOffset: 1,
    },
    20,
    0,
  )

  assert.deepEqual(page?.items, [post])
  assert.equal(page?.hasMore, true)
  assert.equal(page?.nextOffset, 1)
})

test('public blog parser keeps the legacy array response compatible', () => {
  const page = parsePublicBlogListPage([post], 20, 40)

  assert.deepEqual(page?.items, [post])
  assert.equal(page?.hasMore, false)
  assert.equal(page?.nextOffset, 41)
})

test('public blog parser rejects malformed rows and invalid page metadata', () => {
  assert.equal(parsePublicBlogListPage([{ ...post, slug: '' }], 20, 0), null)
  assert.equal(
    parsePublicBlogListPage(
      { items: [post], total: 3, limit: 20, offset: 0, hasMore: true, nextOffset: 2 },
      20,
      0,
    ),
    null,
  )
  assert.equal(
    parsePublicBlogListPage(
      { items: [post], total: 1, limit: 10, offset: 0, hasMore: false, nextOffset: 1 },
      20,
      0,
    ),
    null,
  )
})
