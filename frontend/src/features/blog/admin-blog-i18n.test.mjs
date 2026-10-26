import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL(`../../i18n/locales/${language}.json`, import.meta.url), 'utf8')),
)

const hasLocaleKey = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource) !== undefined

test('admin blog UI references keys present in both locales', () => {
  const sources = [
    '../../pages/Blog.tsx',
    './blog-posts-table.tsx',
    './blog-post-form-dialog.tsx',
    './blog-post-seo-fields.tsx',
    './blog-comments-dialog.tsx',
  ].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'))
  const keys = new Set(
    sources.flatMap((source) => [
      ...[...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key),
      ...[...source.matchAll(/'((?:blog|common)\.[A-Za-z0-9_.]+)'/g)].map(([, key]) => key),
    ]),
  )

  assert.ok(keys.has('blog.admin.loadFailed'))
  assert.ok(keys.has('blog.admin.contentHelp'))
  assert.ok(keys.has('blog.admin.commentLoadFailed'))

  for (const resource of locales) {
    for (const key of keys) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }
})
