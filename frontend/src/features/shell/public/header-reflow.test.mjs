import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const layout = readFileSync(new URL('./public-layout.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../../../styles/globals.css', import.meta.url), 'utf8')

test('Aurum public header adapts to its actual height and restores on resize', () => {
  assert.match(layout, /const height = header\.getBoundingClientRect\(\)\.height/)
  assert.match(layout, /const tall = height > window\.innerHeight \* 0\.3/)
  assert.match(layout, /if \(skin === 'aurum'\) document\.documentElement\.style\.setProperty\('--public-header-offset', `\$\{tall \? 0 : height\}px`\)/)
  assert.match(layout, /document\.documentElement\.style\.removeProperty\('--public-header-offset'\)/)
  assert.match(css, /scroll-padding-top: calc\(var\(--public-header-offset, var\(--header-height\)\) \+ 1rem\)/)
  assert.match(layout, /new ResizeObserver\(update\)/)
  assert.match(layout, /window\.addEventListener\('resize', update\)/)
  assert.match(layout, /observer\.disconnect\(\)/)
  assert.match(layout, /window\.removeEventListener\('resize', update\)/)
  assert.match(layout, /data-header-tall=\{headerTall \? '' : undefined\}/)
  assert.match(css, /\[data-skin="aurum"\] \[data-aurum-shell="header"\]\[data-header-tall\] \{ position: static; \}/)
})
