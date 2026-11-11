import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const shareSource = readFileSync(new URL('./public-blog-share.tsx', import.meta.url), 'utf8')
const postSource = readFileSync(new URL('../../pages/public/PublicBlogPost.tsx', import.meta.url), 'utf8')

test('social share actions render a single link control with safe new-tab behavior', () => {
  assert.match(shareSource, /<Button key=\{link\.label\} asChild[\s\S]*?<a href=\{link\.href\} target="_blank" rel="noopener noreferrer">/)
  assert.doesNotMatch(shareSource, /<a[^>]*>[\s\S]*?<Button/)
  assert.match(shareSource, /<ExternalLink[^>]*aria-hidden="true"\s*\/>/)
})

test('external social links announce that they open in a new tab', () => {
  assert.match(shareSource, /<span className="sr-only">\{t\('public\.blogShare\.opensInNewTab'\)\}<\/span>/)
  assert.match(shareSource, /rel="noopener noreferrer"/)
})

test('share and copy remain explicit button actions', () => {
  // S3: `aria-label` iz i18n („Podijeli – {naslov}", WCAG 2.5.3 / jedinstveno ime)
  // stoji između `size` i `onClick`, pa obrazac dopušta dodatne atribute taga.
  assert.match(shareSource, /<Button[\s\S]*?type="button"[\s\S]*?variant="outline"[\s\S]*?size="sm"[\s\S]*?onClick=\{onShare\}/)
  assert.match(shareSource, /<Button type="button" variant="ghost" size="sm" onClick=\{onCopy\}>/)
  assert.match(shareSource, /aria-label=\{t\('public\.blogShare\.shareArticle', \{ title \}\)\}/)
})

test('cancelling native share does not unexpectedly copy the link', () => {
  assert.match(postSource, /catch \(error\) \{\s*if \(error instanceof Error && error\.name === 'AbortError'\) return\s*\}/)
  assert.match(postSource, /await navigator\.share\([\s\S]*?\n    \}\n    await copyShareUrl\(\)/)
})

test('blog post back navigation renders a single anchor rather than a nested button', () => {
  assert.match(postSource, /<Button asChild variant="ghost"[^>]*>\s*<Link to="\/blog">/)
  assert.doesNotMatch(postSource, /<Link to="\/blog"[^>]*>\s*<Button/)
  assert.match(postSource, /public\.blogPost\.backToBlog/)
})
