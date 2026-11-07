import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const screen = readFileSync(new URL('./HomeScreen.tsx', import.meta.url), 'utf8')

test('home service-category, satisfied-clients, blog, and contact titles expose heading semantics', () => {
  const headings = [
    ['service category', /<Text\s+accessibilityRole="header"\s+style=\{\[styles\.sectionTitle, \{ color: colors\.text \}\]\}>\s*\{category\.name\}/],
    ['satisfied clients', /<Text\s+accessibilityRole="header"\s+style=\{\[styles\.sectionTitle, \{ color: colors\.text \}\]\}>\s*\{t\('home\.satisfiedClientsTitle'\)\}/],
    ['blog', /<Text\s+accessibilityRole="header"\s+style=\{\[styles\.sectionTitle, \{ color: colors\.text \}\]\}>\s*\{t\('home\.latestBlog'\)\}/],
    ['contact', /<Text\s+accessibilityRole="header"\s+style=\{\[styles\.sectionTitle, \{ color: colors\.text \}\]\}>\{t\('home\.contactSectionTitle'\)\}<\/Text>/],
  ]

  for (const [name, pattern] of headings) {
    assert.match(screen, pattern, `Missing heading semantics for ${name}`)
  }
})
