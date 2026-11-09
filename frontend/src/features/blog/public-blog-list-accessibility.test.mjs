import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/public/PublicBlogList.tsx', import.meta.url), 'utf8')

test('public blog list exposes initial and incremental loading states', () => {
  assert.match(source, /aria-busy=\{loading \|\| loadingMore\}/)
  assert.match(source, /\{loading \? \([\s\S]*?<div role="status" aria-live="polite"[^>]*>[\s\S]*?public\.blogList\.loading/)
  assert.match(source, /\{loadingMore \? \([\s\S]*?<span role="status" aria-live="polite" className="sr-only">\s*\{t\('public\.blogList\.loadingMore'\)\}/)
})

test('each public blog card title is a level-two heading and calendar icon is decorative', () => {
  // `lang` (WCAG 3.1.2) stoji ispred `className`, pa obrazac mora dopustiti atribut.
  assert.match(
    source,
    /<h2\s+lang=\{blogPostLang\(p\)\}\s+className=\{`text-lg font-semibold[\s\S]*?\{p\.title\}\s*<\/h2>/,
  )
  assert.match(source, /<Calendar className="h-4 w-4" aria-hidden="true" \/>/)
})
