import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/Loyalty.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../../index.css', import.meta.url), 'utf8')

// ---------------------------------------------------------------------------
// Faza 5 — Lojalnost: semantika tabele (1.3.1) i asocijacija labela (1.3.1/4.1.2)
//
// Modul je imao 1 tabelu sa 7 <th> bez ijednog `scope`, bez `<caption>`, i 7 <td>
// bez `data-label`; plus 4 <Label> bez `htmlFor` u redeem/adjust dijalozima.
// Ovi testovi zaključavaju popravke da ne regresuju.
// ---------------------------------------------------------------------------

test('loyalty table declares all 7 column headers with scope="col"', () => {
  assert.equal(
    (source.match(/<th scope="col" /g) || []).length,
    7,
    'tabela mora imati tacno 7 <th scope="col">',
  )
  // `\b` iza `th` je obavezno: bez njega obrazac hvata i `<thead>`,
  // jer `<thead` takodje pocinje s `<th`.
  const headers = source.match(/<th\b[^>]*>/g) || []
  assert.equal(headers.length, 7, 'tacno 7 <th> elemenata (bez <thead>)')
  const withoutScope = headers.filter((h) => !/scope="col"/.test(h))
  assert.deepEqual(withoutScope, [], 'nijedan <th> ne smije ostati bez scope')
})

test('loyalty table has a localized caption', () => {
  assert.match(source, /<caption className="sr-only">\{t\('loyaltyAdmin\.caption'\)\}<\/caption>/)
  assert.equal((source.match(/<caption/g) || []).length, 1, 'tacno jedan <caption>')
})

test('all 7 body cells carry a dynamic data-label for card mode', () => {
  const labels = source.match(/<td data-label=\{t\('loyaltyAdmin\.(\w+)'\)\}/g) || []
  assert.equal(labels.length, 7, 'tacno 7 <td data-label={t(...)}>')

  // data-label mora biti dinamicki (i18n), ne hardkodovan string
  assert.equal(
    (source.match(/<td data-label="/g) || []).length,
    0,
    'data-label ne smije biti hardkodovan literal',
  )

  // i redoslijed mora odgovarati zaglavlju, inace card-mode prikazuje pogresne nazive
  const order = labels.map((m) => m.match(/loyaltyAdmin\.(\w+)/)[1])
  assert.deepEqual(order, [
    'user',
    'email',
    'points',
    'tier',
    'status',
    'transactions',
    'actions',
  ])
})

test('loyalty table opts into the shared data-table card mode', () => {
  assert.match(source, /<table className="app-table data-table w-full border-collapse">/)
  assert.match(
    css,
    /table\.data-table tbody td::before/,
    'index.css card-mode mora i dalje ciljati table.data-table tbody td::before',
  )
})

test('redeem and adjust dialog fields are programmatically associated', () => {
  for (const id of ['redeem-points', 'redeem-note', 'adjust-delta', 'adjust-note']) {
    assert.match(
      source,
      new RegExp(`htmlFor="${id}"`),
      `<Label htmlFor="${id}"> nedostaje`,
    )
    assert.match(source, new RegExp(`id="${id}"`), `kontrola s id="${id}" nedostaje`)
  }
  assert.equal((source.match(/htmlFor=/g) || []).length, 4, 'tacno 4 asocirana labela')
  assert.equal(
    (source.match(/<Label>\{/g) || []).length,
    0,
    'nijedan <Label> ne smije ostati bez htmlFor',
  )
})
