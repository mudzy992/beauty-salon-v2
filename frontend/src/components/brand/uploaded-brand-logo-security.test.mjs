import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const logoSource = readFileSync(new URL('./uploaded-brand-logo.tsx', import.meta.url), 'utf8')
const uploadUrlSource = readFileSync(new URL('../../utils/uploadUrl.ts', import.meta.url), 'utf8')

test('SVG brand logos stay external CSS mask images and never enter an HTML sink', () => {
  assert.match(logoSource, /const maskUrl = `url\("\$\{encodeURI\(logoUrl\)\}"\)`/)
  assert.match(logoSource, /maskImage:\s*maskUrl/)
  assert.match(logoSource, /WebkitMaskImage:\s*maskUrl/)
  assert.doesNotMatch(logoSource, /dangerouslySetInnerHTML|innerHTML\s*=|insertAdjacentHTML|DOMParser|fetch\s*\(/i)
})

test('uploaded asset passthrough accepts only absolute HTTP(S) scheme prefixes', () => {
  assert.ok(uploadUrlSource.includes(String.raw`if (/^https?:\/\//i.test(path)) return path;`))
  assert.doesNotMatch(uploadUrlSource, /startsWith\(['"]http['"]\)/i)
})
