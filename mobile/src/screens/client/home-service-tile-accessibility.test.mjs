import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const screen = readFileSync(new URL('./HomeScreen.tsx', import.meta.url), 'utf8')
const pressComponent = screen.slice(
  screen.indexOf('function ServiceTilePress'),
  screen.indexOf('export function HomeScreen'),
)
const serviceTile = screen.match(/<ServiceTilePress([\s\S]*?)\n\s*>/)?.[1]

test('home service tiles expose localized service details and an action hint', () => {
  assert.ok(pressComponent, 'ServiceTilePress should exist')
  assert.match(pressComponent, /accessibilityRole="button"/)
  assert.match(pressComponent, /accessibilityLabel=\{accessibilityLabel\}/)
  assert.match(pressComponent, /accessibilityHint=\{accessibilityHint\}/)

  assert.ok(serviceTile, 'Home service tile should pass accessible name and hint')
  assert.match(serviceTile, /accessibilityLabel=\{serviceTileLabel\}/)
  assert.match(serviceTile, /accessibilityHint=\{t\('home\.openServiceDetailsHint'\)\}/)
  assert.match(screen, /t\('home\.serviceTileAccessibilityLabelWithPrice', \{/)
  assert.match(screen, /t\('home\.serviceTileAccessibilityLabel', \{/)
  assert.match(screen, /t\('home\.featuredServiceTileAccessibilityLabel', \{ details: serviceTileDetails \}\)/)
  assert.match(screen, /service: service\.name/)
  assert.match(screen, /duration: service\.durationMinutes/)
  assert.match(screen, /price: formattedPrice/)
})
