import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const pageSource = readFileSync(new URL('../../pages/public/PublicBlogPost.tsx', import.meta.url), 'utf8')
const commentsSource = readFileSync(new URL('./public-blog-comments.tsx', import.meta.url), 'utf8')

test('comment submission trims content, prevents duplicate requests, and targets the current post', () => {
  assert.match(pageSource, /const content = newComment\.trim\(\)/)
  assert.match(pageSource, /if \(!post\?\.id \|\| !content \|\| commentSubmissionInFlight\.current\) return/)
  assert.match(pageSource, /const submittedPostId = post\.id/)
  assert.match(pageSource, /api\.post\(`\/api\/blog\/\$\{submittedPostId\}\/comments`, \{ content \}\)/)
})

test('comment submission ignores stale results and contains mutation failures', () => {
  assert.match(pageSource, /const generation = \+\+commentSubmissionGeneration\.current/)
  assert.match(pageSource, /if \(generation !== commentSubmissionGeneration\.current\) return/)
  assert.match(pageSource, /commentSubmissionGeneration\.current \+= 1/)
  assert.match(pageSource, /toast\.error\(t\('public\.blogPost\.commentSubmitFailed'\)\)/)
  assert.match(pageSource, /if \(generation === commentSubmissionGeneration\.current\) \{\s*commentSubmissionInFlight\.current = false/)
})

test('comment input draft is reset when changing article routes', () => {
  assert.match(pageSource, /useEffect\(\(\) => \{\s*setNewComment\(''\)\s*\}, \[slug\]\)/)
})

test('comment submission feedback is announced and the submit control exposes busy state', () => {
  assert.match(commentsSource, /disabled=\{submitting \|\| !newComment\.trim\(\)\}[\s\S]*?aria-busy=\{submitting\}/)
  assert.match(commentsSource, /\{submitting \? \([\s\S]*?<span role="status" aria-live="polite" className="sr-only">\s*\{t\('public\.blogComments\.submitting'\)\}/)
})
