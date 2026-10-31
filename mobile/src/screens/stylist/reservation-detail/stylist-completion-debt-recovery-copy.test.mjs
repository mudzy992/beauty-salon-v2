import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../../i18n/bs.ts', import.meta.url), 'utf8')

test('completion modal distinguishes a debt read error from a valid empty debt list', () => {
  assert.match(resources, /clientDebtsLoadError: 'Otvorena dugovanja trenutno nije moguće učitati\.'/)
  assert.match(resources, /noOpenDebts: 'Nema otvorenih dugovanja\.'/)
  assert.match(resources, /common:[\s\S]*?retry:/)
})
