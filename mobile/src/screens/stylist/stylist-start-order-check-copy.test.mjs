import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const bosnian = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')

test('start-order check failure has Bosnian recovery copy', () => {
  assert.match(
    bosnian,
    /startOrderCheckError: 'Nije moguće provjeriti redoslijed ranijih termina\. Pokušajte ponovo\.'/,
  )
})
