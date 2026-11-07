import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const screen = readFileSync(new URL('./ServicesScreen.tsx', import.meta.url), 'utf8')

test('services discovery page title and section titles expose heading semantics', () => {
  assert.match(
    screen,
    /<Text\s+accessibilityRole="header"\s+style=\{\[styles\.heroTitle, \{ color: colors\.text \}\]\}>\s*\{t\('services\.serviceDiscoveryTitle'\)\}/,
  )

  const sectionTitles = ['popularServiceHeading', 'lastUsedServiceHeading', 'categories']
  for (const key of sectionTitles) {
    assert.match(
      screen,
      new RegExp(`<Text\\s+accessibilityRole="header"\\s+style=\\{\\[styles\\.sectionTitle, \\{ color: colors\\.text \\}\\]\\}>\\s*\\{t\\('services\\.${key}'\\)\\}`),
      `Missing heading semantics for services.${key}`,
    )
  }
})
