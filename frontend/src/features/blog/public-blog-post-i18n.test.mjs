import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL(`../../i18n/locales/${language}.json`, import.meta.url), 'utf8')),
)

const hasLocaleKey = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource) !== undefined

test('public blog post, comments, and share UI use keys present in both locales', () => {
  const sources = [
    '../../pages/public/PublicBlogPost.tsx',
    './public-blog-comments.tsx',
    './public-blog-share.tsx',
  ].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'))
  const keys = new Set(
    sources.flatMap((source) => [...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key)),
  )

  assert.ok(keys.has('public.blogPost.loadFailed'))
  assert.ok(keys.has('public.blogComments.loadFailed'))
  assert.ok(keys.has('public.blogShare.copyLink'))

  for (const resource of locales) {
    for (const key of keys) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }
})
