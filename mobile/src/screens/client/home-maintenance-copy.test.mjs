import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./HomeScreen.tsx', import.meta.url), 'utf8')

test('home maintenance state has localized title and fallback message resources', () => {
  assert.match(resources, /maintenanceTitle: 'Privremeno nedostupno'/)
  assert.match(resources, /maintenanceMessageFallback: 'Radimo na poboljšanjima\. Molimo pokušajte kasnije\.'/)
})

test('home maintenance state uses its localized title and server-message fallback', () => {
  assert.match(screen, /t\('home\.maintenanceTitle'\)/)
  assert.match(screen, /getSettingValue\(settings, 'public_maintenance_message', ''\)\.trim\(\) \|\|\s*t\('home\.maintenanceMessageFallback'\)/)
  assert.doesNotMatch(screen, /<Text[^>]*>Privremeno nedostupno<\/Text>/)
  assert.doesNotMatch(screen, /'Radimo na poboljšanjima\. Molimo pokušajte kasnije\.'/)
})
