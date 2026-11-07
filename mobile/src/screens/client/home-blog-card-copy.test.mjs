import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')

test('home blog cards have localized category, content/date names, and detail-navigation hint', () => {
  assert.match(resources, /blogTag: 'Blog'/)
  assert.match(resources, /blogPostCardAccessibilityLabel: '\{\{title\}\}\. \{\{excerpt\}\}'/)
  assert.match(resources, /blogPostCardAccessibilityLabelWithDate: '\{\{title\}\}\. \{\{excerpt\}\}\. \{\{date\}\}\.'/)
  assert.match(resources, /openBlogPostHint: 'Otvara objavu na blogu\.'/)
})
