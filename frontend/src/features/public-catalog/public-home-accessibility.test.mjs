import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/public/PublicHome.tsx', import.meta.url), 'utf8')

test('public homepage exposes its configured hero title as the sole level-one heading', () => {
  assert.equal([...source.matchAll(/<h1\b/g)].length, 1)
  assert.match(source, /<h1 className="text-4xl[\s\S]*?\{titleRest \?[\s\S]*?heroTitle[\s\S]*?<\/h1>/)
})

test('homepage highlight and about titles are semantic section headings', () => {
  assert.match(source, /<h2 className="text-lg font-semibold text-slate-900 mb-2">\s*\{item\.title\}\s*<\/h2>/)
  assert.match(source, /<h2 className="text-3xl md:text-4xl font-semibold text-slate-900 mt-2">\s*\{aboutTitle\}\s*<\/h2>/)
  assert.match(source, /<h2 className="text-2xl font-semibold tracking-tight text-slate-950">\s*\{getSetting\('public_cta_title'/)
})

test('decorative homepage highlight icons are hidden from assistive technology', () => {
  assert.match(source, /<Icon className="h-10 w-10 text-brand-gold-text mx-auto mb-4" aria-hidden="true" \/>/)
})
