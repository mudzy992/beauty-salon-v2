import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

/**
 * Finance table a11y — caption, scope i data-label na svakoj tabeli.
 *
 * Zašto postoji: plan (07_phase-4-finance.md, D6/D10) tvrdio je da finance
 * tabelama nedostaju caption i scope. Provjera izvora pokazala je da je to
 * **djelimično netačno** — `expense-table.tsx` i `income-entries-table.tsx` su
 * već imali puno pokrivanje (4/4 i 5/5 u izvornom tekstu), a zaostajala je samo
 * `expense-invoice-preview.tsx`. Ovaj test zaključava stvarno stanje po fajlu,
 * s tačnim brojevima, da regresija ne prođe.
 *
 * D10: card-mode ispod 640px postoji u `index.css` ali cilja `table.data-table`,
 * dok su finance tabele nosile samo `app-table` — pa card-mode za njih nije
 * važio. `data-label` je obavezan jer `td::before { content: attr(data-label) }`
 * bez njega gubi vezu ćelije s nazivom kolone (WCAG 1.3.1).
 */
const TABLES = [
  {
    file: 'expense/expense-table.tsx',
    // 3 `<th` dolaze iz COLUMNS.map() + 3 statična = 6 renderovanih kolona
    sourceTh: 4,
    scope: 4,
    td: 6,
    captionKey: 'finance.expenseList.caption',
  },
  {
    file: 'income/income-entries-table.tsx',
    // 4 `<th` iz COLUMNS.map() + 4 statična = 8 renderovanih kolona
    sourceTh: 5,
    scope: 5,
    td: 8,
    captionKey: 'finance.incomeList.caption',
  },
  {
    file: 'expense/expense-invoice-preview.tsx',
    sourceTh: 2,
    scope: 2,
    td: 4, // 2 u tbody + 2 u tfoot
    tbodyTd: 2, // samo tbody treba data-label (CSS cilja tbody td::before)
    captionKey: 'finance.expenseList.invoiceItemsCaption',
  },
]

const read = (file) => readFileSync(new URL('./' + file, import.meta.url), 'utf8')

const count = (source, pattern) => (source.match(pattern) || []).length

for (const spec of TABLES) {
  test(`${spec.file}: caption, scope i data-table su prisutni`, () => {
    const source = read(spec.file)

    assert.match(
      source,
      /<caption className="sr-only">/,
      'tabela mora imati sr-only caption',
    )
    assert.ok(
      source.includes(`t('${spec.captionKey}')`),
      `caption mora koristiti ključ ${spec.captionKey}`,
    )
    assert.match(
      source,
      /className="app-table data-table w-full"/,
      'tabela mora nositi i data-table klasu da bi važila card-mode ispod 640px',
    )

    const th = count(source, /<th[\s>]/g)
    const scope = count(source, /scope="col"/g)
    assert.equal(th, spec.sourceTh, `očekivano ${spec.sourceTh} <th> u izvornom tekstu`)
    assert.equal(scope, spec.scope, `očekivano ${spec.scope} scope="col"`)
    assert.equal(th, scope, 'svaki <th> mora imati scope')
  })

  test(`${spec.file}: data-label pokriva tbody ćelije`, () => {
    const source = read(spec.file)

    const td = count(source, /<td[\s>]/g)
    assert.equal(td, spec.td, `očekivano ${spec.td} <td>`)

    const expected = spec.tbodyTd ?? spec.td
    const labels = count(source, /data-label=\{/g)
    assert.equal(labels, expected, `očekivano ${expected} data-label`)

    // Svaki data-label mora biti lokalizovan, ne hardkodovan string.
    const hardcoded = count(source, /data-label="/g)
    assert.equal(hardcoded, 0, 'data-label ne smije biti hardkodovan')
  })
}

test('nema finance tabele bez captiona', () => {
  // Ako neko doda novu tabelu, mora je dodati i u TABLES iznad.
  for (const spec of TABLES) {
    const source = read(spec.file)
    assert.ok(
      source.includes('<table'),
      `${spec.file} više ne sadrži <table> — ažuriraj TABLES`,
    )
  }
})

test('card-mode CSS cilja data-table i koristi data-label', () => {
  // index.css je na frontend/src/index.css, a ovaj test je u
  // frontend/src/features/finance/ — dakle dva nivoa gore, ne tri.
  const css = readFileSync(
    new URL('../../index.css', import.meta.url),
    'utf8',
  )
  assert.match(css, /@media \(max-width: 639px\)/)
  assert.match(css, /table\.data-table tbody td::before/)
  assert.match(css, /content: attr\(data-label\)/)
})
