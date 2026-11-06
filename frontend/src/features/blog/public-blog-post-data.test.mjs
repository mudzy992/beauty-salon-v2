import assert from 'node:assert/strict'
import test from 'node:test'

import { parsePublicBlogPost } from './public-blog-post-data.mjs'

const post = {
  id: 'post-1',
  title: 'Njega kose',
  slug: 'njega-kose',
  content: '<p>Tekst</p>',
  excerpt: null,
  seoTitle: null,
  seoDescription: null,
  heroImage: null,
  ogImage: null,
  noIndex: false,
  publishedAt: '2026-11-05T10:00:00.000Z',
  updatedAt: null,
}

test('public blog detail parser accepts a complete response for the requested slug', () => {
  assert.deepEqual(parsePublicBlogPost(post, 'njega-kose'), post)
})

test('public blog detail parser rejects mismatched route identity and malformed required data', () => {
  assert.equal(parsePublicBlogPost(post, 'another-post'), null)
  assert.equal(parsePublicBlogPost({ ...post, content: undefined }, 'njega-kose'), null)
  assert.equal(parsePublicBlogPost({ ...post, publishedAt: 'not-a-date' }, 'njega-kose'), null)
})

test('public blog detail parser permits optional metadata to be absent or null', () => {
  const minimal = {
    id: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    publishedAt: post.publishedAt,
  }
  assert.deepEqual(parsePublicBlogPost(minimal, 'njega-kose'), minimal)
})
