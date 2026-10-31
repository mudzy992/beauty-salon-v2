import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')

test('stylist picker recovery copy is available in Bosnian', () => {
  for (const [key, copy] of [
    ['clientListLoadError', 'Klijente nije moguće učitati. Pokušajte ponovo.'],
    ['clientListStaleMessage', 'Prikazujemo ranije učitane klijente; osvježavanje nije uspjelo.'],
    ['clientSearchLoadError', 'Pretragu klijenata nije moguće učitati. Pokušajte ponovo.'],
  ]) {
    assert.ok(resources.includes(`${key}: '${copy}'`), `Missing Bosnian picker recovery copy: ${key}`)
  }
})
