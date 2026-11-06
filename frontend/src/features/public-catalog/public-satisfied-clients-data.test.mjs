import assert from 'node:assert/strict'
import test from 'node:test'

import { parsePublicSatisfiedClientsPage } from './public-satisfied-clients-data.mjs'

const pair = {
  id: 'entry-1',
  before: { pathOriginal: '/api/media/before', pathMedium: null, pathThumb: null },
  after: { pathOriginal: '/api/media/after', pathMedium: null, pathThumb: null },
}
const page = { items: [pair], hasMore: true, nextOffset: 13 }

test('satisfied clients parser accepts page metadata consistent with the requested offset', () => {
  assert.deepEqual(parsePublicSatisfiedClientsPage(page, 12, 12), page)
})

test('satisfied clients parser accepts a valid final and empty page', () => {
  assert.deepEqual(parsePublicSatisfiedClientsPage({ items: [pair], hasMore: false, nextOffset: 1 }, 12, 0), {
    items: [pair],
    hasMore: false,
    nextOffset: 1,
  })
  assert.deepEqual(parsePublicSatisfiedClientsPage({ items: [], hasMore: false, nextOffset: 0 }, 12, 0), {
    items: [],
    hasMore: false,
    nextOffset: 0,
  })
})

test('satisfied clients parser rejects malformed pairs and inconsistent pagination', () => {
  assert.equal(parsePublicSatisfiedClientsPage({ items: [{ ...pair, before: null }], hasMore: false, nextOffset: 1 }, 12, 0), null)
  assert.equal(
    parsePublicSatisfiedClientsPage({
      items: [{ ...pair, before: { ...pair.before, pathMedium: '' } }],
      hasMore: false,
      nextOffset: 1,
    }, 12, 0),
    null,
  )
  assert.equal(parsePublicSatisfiedClientsPage({ ...page, nextOffset: 12 }, 12, 12), null)
  assert.equal(parsePublicSatisfiedClientsPage({ ...page, hasMore: true, items: [] }, 12, 12), null)
  assert.equal(parsePublicSatisfiedClientsPage(page, 12, -1), null)
})
