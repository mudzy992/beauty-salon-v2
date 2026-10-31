import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')

test('contact information read recovery copy is localized in Bosnian', () => {
  assert.match(resources, /settingsLoadError: 'Kontaktne podatke nije moguće učitati\.'/)
  assert.match(resources, /workingHoursLoadError: 'Radno vrijeme trenutno nije moguće učitati\.'/)
  assert.match(resources, /common:[\s\S]*?retry:/)
})
