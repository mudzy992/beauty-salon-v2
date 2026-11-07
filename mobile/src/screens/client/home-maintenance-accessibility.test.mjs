import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const screen = readFileSync(new URL('./HomeScreen.tsx', import.meta.url), 'utf8')

test('home maintenance state exposes its localized title as a heading', () => {
  assert.match(
    screen,
    /<Text\s+accessibilityRole="header"\s+style=\{\[styles\.heroTitle, \{ textAlign: 'center', marginBottom: 16 \}\]\}>\{t\('home\.maintenanceTitle'\)\}<\/Text>/,
  )
})
