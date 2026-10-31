import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')

test('optional services screen read failures have Bosnian recovery copy', () => {
  assert.match(resources, /popularServiceLoadError: 'Popularnu uslugu trenutno nije moguće učitati\.'/)
  assert.match(resources, /lastUsedServiceLoadError: 'Ranije rezervisane usluge trenutno nije moguće učitati\.'/)
  assert.match(resources, /common:[\s\S]*?retry:/)
})
