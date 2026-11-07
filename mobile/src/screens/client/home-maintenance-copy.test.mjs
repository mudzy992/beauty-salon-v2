import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')

test('home maintenance state has localized title and fallback message resources', () => {
  assert.match(resources, /maintenanceTitle: 'Privremeno nedostupno'/)
  assert.match(resources, /maintenanceMessageFallback: 'Radimo na poboljšanjima\. Molimo pokušajte kasnije\.'/)
})
