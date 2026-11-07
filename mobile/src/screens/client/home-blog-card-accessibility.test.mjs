import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const screen = readFileSync(new URL('./HomeScreen.tsx', import.meta.url), 'utf8')
const blogSectionStart = screen.indexOf('{blogPosts.map((post) => {')
const blogSectionEnd = screen.indexOf('{/* Contact details */}', blogSectionStart)
const blogSection = screen.slice(blogSectionStart, blogSectionEnd)
const blogCard = blogSection.match(/<Card\b([\s\S]*?)>/)?.[1]

test('home blog posts expose a button name with title, excerpt, optional date, and a navigation hint', () => {
  assert.ok(blogCard, 'Blog post card should exist')
  assert.match(blogCard, /accessibilityLabel=\{accessibilityLabel\}/)
  assert.match(blogCard, /accessibilityHint=\{t\('home\.openBlogPostHint'\)\}/)
  assert.match(screen, /onPress=\{\(\) => navigation\.navigate\('BlogPost', \{ slug: post\.slug \}\)\}/)
  assert.match(screen, /t\('home\.blogPostCardAccessibilityLabelWithDate', \{/)
  assert.match(screen, /t\('home\.blogPostCardAccessibilityLabel', \{/)
  assert.match(screen, /title: post\.title/)
  assert.match(screen, /excerpt,/)
  assert.match(screen, /date: publishedDate/)
  assert.match(screen, /t\('home\.blogTag'\)/)
})
