import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')

test('service tile accessibility copy covers service, duration, optional price, and navigation', () => {
  assert.match(resources, /serviceTileAccessibilityLabel: '\{\{service\}\}, \{\{duration\}\} min\.'/)
  assert.match(resources, /serviceTileAccessibilityLabelWithPrice: '\{\{service\}\}, \{\{duration\}\} min, \{\{price\}\}\.'/)
  assert.match(resources, /openServiceDetailsHint: 'Otvara detalje usluge\.'/)
})
