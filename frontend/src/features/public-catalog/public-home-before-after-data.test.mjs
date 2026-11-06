import assert from 'node:assert/strict'
import test from 'node:test'

import { parsePublicHomeBeforeAfter } from './public-home-before-after-data.mjs'

const pair = {
  id: 'entry-1',
  before: { pathOriginal: '/api/media/consents/before', pathMedium: null, pathThumb: null },
  after: { pathOriginal: '/api/media/consents/after', pathMedium: null, pathThumb: null },
}

test('homepage before/after parser accepts the public response envelope', () => {
  assert.deepEqual(parsePublicHomeBeforeAfter({ items: [pair], hasMore: false, nextOffset: 0 }), [pair])
})

test('homepage before/after parser accepts valid empty collections', () => {
  assert.deepEqual(parsePublicHomeBeforeAfter({ items: [] }), [])
})

test('homepage before/after parser rejects malformed envelopes, pairs, and media paths', () => {
  assert.equal(parsePublicHomeBeforeAfter([]), null)
  assert.equal(parsePublicHomeBeforeAfter({ items: [{ ...pair, id: '' }] }), null)
  assert.equal(
    parsePublicHomeBeforeAfter({ items: [{ ...pair, after: { pathOriginal: '' } }] }),
    null,
  )
  assert.equal(parsePublicHomeBeforeAfter({ items: null }), null)
})
