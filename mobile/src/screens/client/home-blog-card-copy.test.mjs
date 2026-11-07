import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./HomeScreen.tsx', import.meta.url), 'utf8')

test('home blog cards have localized category, content/date names, and detail-navigation hint', () => {
  assert.match(resources, /blogTag: 'Blog'/)
  assert.match(resources, /blogExcerptFallback: 'Savjeti i inspiracija iz svijeta njege i frizerskih trendova\.'/)
  assert.match(screen, /function getBlogExcerpt\(content: string, fallback: string, max = 110\): string/)
  assert.match(screen, /if \(!plain\) return fallback/)
  assert.match(screen, /getBlogExcerpt\(post\.excerpt \?\? post\.content \?\? '', t\('home\.blogExcerptFallback'\)\)/)
  assert.doesNotMatch(screen, /return 'Savjeti i inspiracija iz svijeta njege i frizerskih trendova\.'/)
  assert.match(resources, /blogPostCardAccessibilityLabel: '\{\{title\}\}\. \{\{excerpt\}\}'/)
  assert.match(resources, /blogPostCardAccessibilityLabelWithDate: '\{\{title\}\}\. \{\{excerpt\}\}\. \{\{date\}\}\.'/)
  assert.match(resources, /openBlogPostHint: 'Otvara objavu na blogu\.'/)
})
