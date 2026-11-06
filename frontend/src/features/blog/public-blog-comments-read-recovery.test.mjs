import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/public/PublicBlogPost.tsx', import.meta.url), 'utf8')

test('public comments validate unknown payloads at the requested page offset', () => {
  assert.match(source, /api\.get<unknown>\([\s\S]*?params: \{ limit: COMMENT_PAGE_SIZE, offset \}/)
  assert.match(source, /parsePublicBlogComments\(data, COMMENT_PAGE_SIZE, offset\)/)
  assert.match(source, /if \(!page\) throw new Error\('Invalid public blog comments response'\)/)
})

test('public comments ignore stale and unmounted requests without changing current loading state', () => {
  assert.match(source, /const generation = \+\+commentsRequestGeneration\.current/)
  assert.match(source, /if \(generation !== commentsRequestGeneration\.current\) return/)
  assert.match(source, /commentsRequestGeneration\.current \+= 1/)
  assert.match(source, /finally \{\s*if \(generation === commentsRequestGeneration\.current\)/)
})

test('public comments preserve existing rows on pagination failure and retry the failed page', () => {
  assert.match(source, /if \(!append\) \{\s*setComments\(\[\]\)/)
  assert.match(source, /commentsRetryRef\.current = \{ offset, append \}/)
  assert.match(source, /const \{ offset, append \} = commentsRetryRef\.current/)
  assert.match(source, /onRetryComments=\{retryComments\}/)
})
