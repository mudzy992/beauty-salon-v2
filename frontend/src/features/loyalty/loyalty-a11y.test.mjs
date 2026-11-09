import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/Loyalty.tsx', import.meta.url), 'utf8')
const dataTable = readFileSync(new URL('../shell/admin/ui/data-table.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../../index.css', import.meta.url), 'utf8')

// ---------------------------------------------------------------------------
// Faza 5 — Lojalnost: semantika tabele (1.3.1) i asocijacija labela (1.3.1/4.1.2)
//
// Modul je imao 1 tabelu sa 7 <th> bez ijednog `scope`, bez `<caption>`, i 7 <td>
// bez `data-label`; plus 4 <Label> bez `htmlFor` u redeem/adjust dijalozima.
// Ovi testovi zaključavaju popravke da ne regresuju.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 2026-11-09 — tabela je prešla na dijeljenu `DataTable` komponentu.
//
// Time se mijenja ŠTA se ovdje može asertovati: `<caption>`, `scope="col"` i
// `data-label` više nisu u ovom fajlu, nego u `data-table.tsx`, gdje ih već
// zaključava `templates-a11y.test.mjs`. Zato ovi testovi sada dokazuju dvije
// stvari: (1) da `DataTable` i dalje nosi te garancije, i (2) da Loyalty
// stvarno koristi `DataTable` s ispravnim propovima — uključujući redoslijed
// kolona, jer `data-label` u card-mode-u zavisi od njega.
// ---------------------------------------------------------------------------

test('DataTable nosi semantiku tabele (1.3.1) — jedna provjera za sve potrošače', () => {
  assert.match(dataTable, /<caption className="sr-only">\{caption\}<\/caption>/)
  assert.match(dataTable, /scope="col"/)
  assert.match(dataTable, /data-label=\{t\(column\.headerKey\)\}/)
  assert.match(dataTable, /app-table data-table w-full/, 'card-mode ispod 640px zavisi od ove klase')
  assert.match(css, /table\.data-table tbody td::before/)
})

test('loyalty tabela koristi DataTable s lokalizovanim caption-om', () => {
  assert.match(source, /import \{ DataTable, type DataTableColumn \} from '\.\.\/features\/shell\/admin\/ui\/data-table'/)
  assert.match(source, /<DataTable/)
  assert.match(source, /caption=\{t\('loyaltyAdmin\.caption'\)\}/)
  assert.match(source, /rowKey=\{\(a\) => a\.id\}/)
  // `tableClassName` čuva `border-collapse` koji je tabla imala i prije migracije.
  assert.match(source, /tableClassName="border-collapse"/)
  // Ručno napisana tabela se ne smije vratiti uz dijeljenu komponentu.
  assert.equal((source.match(/<table\b/g) || []).length, 0, 'ne smije ostati ručno napisana <table>')
})

test('svih 7 kolona je deklarisano, istim redoslijedom kao prije migracije', () => {
  const zaglavlja = [...source.matchAll(/headerKey: 'loyaltyAdmin\.(\w+)'/g)].map((m) => m[1])
  assert.deepEqual(zaglavlja, [
    'user',
    'email',
    'points',
    'tier',
    'status',
    'transactions',
    'actions',
  ])
  // data-label u card-mode-u je `t(column.headerKey)`, pa nijedan ne smije biti literal
  const kolone = [...source.matchAll(/key: '(\w+)',\s*\n?\s*headerKey:/g)]
  assert.ok(kolone.length >= 7, 'očekivano barem 7 kolona s headerKey')
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
