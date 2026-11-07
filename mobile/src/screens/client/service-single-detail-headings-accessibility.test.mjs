import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const screen = readFileSync(new URL('./ServiceSingleDetailScreen.tsx', import.meta.url), 'utf8')

test('single-service detail title and content sections expose heading semantics', () => {
  const headings = [
    /<Text accessibilityRole="header" style=\{styles\.heroTitle\}>\{service\.name\}<\/Text>/,
    /<Text accessibilityRole="header" style=\{\[styles\.sectionTitle, \{ color: colors\.text \}\]\}>\{t\('services\.description'\)\}<\/Text>/,
    /<Text accessibilityRole="header" style=\{\[styles\.sectionTitle, \{ color: colors\.text \}\]\}>\s*\{t\('reviews\.title'\)\}/,
    /<Text accessibilityRole="header" style=\{\[styles\.sectionTitle, \{ color: colors\.text \}\]\}>\s*\{t\('services\.beforeAfterSectionTitle'\)\}/,
  ]

  for (const heading of headings) {
    assert.match(screen, heading)
  }
})
