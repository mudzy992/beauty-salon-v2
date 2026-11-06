import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/public/PublicBlogList.tsx', import.meta.url), 'utf8')

test('public blog list requests unknown payloads and validates before updating rows', () => {
  assert.match(source, /api\.get<unknown>\('\/api\/blog'/)
  assert.match(source, /parsePublicBlogListPage\(data, PAGE_SIZE, offset\)/)
  assert.match(source, /if \(!page\) throw new Error\('Invalid public blog list response'\)/)
  assert.match(source, /setPosts\(\(current\) => \(append \? \[\.\.\.current, \.\.\.page\.items\] : page\.items\)\)/)
})

test('public blog list ignores stale requests and invalidates pending reads after unmount', () => {
  assert.match(source, /const generation = \+\+requestGeneration\.current/)
  assert.match(source, /if \(generation !== requestGeneration\.current\) return/)
  assert.match(source, /return \(\) => \{\s*requestGeneration\.current \+= 1/)
  assert.match(source, /finally \{\s*if \(generation === requestGeneration\.current\)/)
})

test('pagination errors retain existing posts and offer retry at the same offset', () => {
  const catchBlock = source.slice(source.indexOf('} catch {'), source.indexOf('} finally {'))
  assert.match(catchBlock, /if \(!append\) setPosts\(\[\]\)/)
  assert.match(source, /onClick=\{\(\) => void loadPage\(nextOffset, true\)\}/)
  assert.match(source, /role="alert"[\s\S]*?public\.blogList\.loadFailed/)
})
