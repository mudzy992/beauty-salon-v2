import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/public/PublicGallery.tsx', import.meta.url), 'utf8')

test('public gallery initial loading is announced as a polite status', () => {
  assert.match(source, /\{loading \? \([\s\S]*?<div role="status" aria-live="polite"[^>]*>\{t\('public\.gallery\.loading'\)\}/)
})

test('gallery lightbox uses a named Radix dialog with its category context', () => {
  assert.match(source, /import \{[\s\S]*?Dialog,[\s\S]*?DialogContent,[\s\S]*?DialogTitle[\s\S]*?\} from '\.\.\/\.\.\/components\/ui\/dialog'/)
  assert.match(source, /<Dialog\s+open=\{Boolean\(lightbox\)\}[\s\S]*?<DialogContent[\s\S]*?<DialogTitle className="sr-only">\s*\{t\('public\.gallery\.openImage'\)\}: \{lightbox\.categoryName\}/)
  assert.match(source, /src=\{lightbox\.src\}\s+alt=\{lightbox\.categoryName\}/)
  assert.doesNotMatch(source, /role="dialog"\s+aria-modal="true"/)
})

test('gallery image controls expose a category-specific name and open the selected image', () => {
  assert.match(source, /setLightbox\(\{\s*src: originalUrl,\s*categoryName: cat\.name,\s*\}\)/)
  assert.match(source, /aria-label=\{`\$\{t\('public\.gallery\.openImage'\)\}: \$\{cat\.name\}`\}/)
})

test('gallery image controls use native button keyboard semantics and visible focus', () => {
  assert.match(source, /const MotionButton = motion\.button/)
  assert.match(source, /<MotionButton\s+key=\{img\.id\}\s+type="button"[\s\S]*?disabled=\{!originalUrl\}[\s\S]*?focus-visible:ring-2/)
  assert.match(source, /<MotionButton[\s\S]*?onClick=\{\(event\) => \{[\s\S]*?setLightbox\(\{[\s\S]*?\}\)[\s\S]*?\}\}[\s\S]*?<\/MotionButton>/)
  assert.match(source, /lightboxTriggerRef\.current = event\.currentTarget/)
  assert.match(source, /onCloseAutoFocus=/)
  assert.doesNotMatch(source, /role="button"|tabIndex=\{0\}|onKeyDown=\{\(e\)/)
})
