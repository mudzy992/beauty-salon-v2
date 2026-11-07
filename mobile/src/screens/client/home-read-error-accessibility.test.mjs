import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const screen = readFileSync(new URL('./HomeScreen.tsx', import.meta.url), 'utf8')

test('home read failures expose alert semantics for each independent section', () => {
  const errorCopyKeys = [
    'loadErrorTitle',
    'debtLoadError',
    'reservationLoadError',
    'beforeAfterLoadError',
    'featuredReviewLoadError',
  ]

  for (const key of errorCopyKeys) {
    const pattern = new RegExp(`accessibilityRole="alert"[^>]*>\\s*\\{t\\('home\\.${key}'\\)\\}`)
    assert.match(screen, pattern, `Missing alert semantics for home.${key}`)
  }
})
