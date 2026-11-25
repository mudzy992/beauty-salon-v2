import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// S9: forma za komentar je izdvojena u `public-blog-comment-form.tsx`;
// test čita OBA modula zajedno, pa tvrdnje i dalje pokrivaju isti kod.
const source = [
  readFileSync(new URL('./public-blog-comments.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('./public-blog-comment-form.tsx', import.meta.url), 'utf8'),
].join('\n')

test('public blog comments have a level-two section heading', () => {
  assert.match(source, /<h2 className="mb-6[\s\S]*?public\.blogComments\.title[\s\S]*?<\/h2>/)
})

test('comment input has a visible programmatically associated label', () => {
  assert.match(
    source,
    /<Label htmlFor="public-blog-comment">\s*\{t\('public\.blogComments\.placeholder'\)\}\s*<\/Label>[\s\S]*?<Textarea\s+id="public-blog-comment"/,
  )
})

test('initial and incremental comment loading use polite status regions', () => {
  assert.match(source, /\{loading \? \([\s\S]*?<div role="status" aria-live="polite"[^>]*>\{t\('common\.loading'\)\}/)
  assert.match(source, /\{loadingMore \? \([\s\S]*?<span role="status" aria-live="polite" className="sr-only">\s*\{t\('public\.blogComments\.loadingMore'\)\}/)
})
