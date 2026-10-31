import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')

test('before-after gallery recovery and empty-state copy is localized in Bosnian', () => {
  for (const [key, copy] of [
    ['title', 'Galerija'],
    ['pageHint', 'Povucite razdjelnik lijevo ili desno za poređenje fotografija prije i poslije.'],
    ['emptyTitle', 'Nema transformacija'],
    ['emptyMessage', 'Kada budu dostupne, pojavit će se ovdje.'],
    ['loadError', 'Galeriju trenutno nije moguće učitati.'],
    ['loadMoreError', 'Dodatne fotografije nije moguće učitati. Pokušajte ponovo.'],
  ]) {
    assert.ok(resources.includes(`${key}: '${copy}'`), `Missing gallery copy: ${key}`)
  }
  assert.match(resources, /common:[\s\S]*?retry:/)
})
