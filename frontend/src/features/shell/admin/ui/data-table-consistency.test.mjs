import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const HERE = fileURLToPath(new URL('.', import.meta.url))
// ui -> admin -> shell -> features -> src
const SRC = join(HERE, '..', '..', '..', '..')

const read = (abs) => readFileSync(abs, 'utf8')
const dataTable = read(join(HERE, 'data-table.tsx'))

/**
 * Konzistentnost dashboard tabela — zajedničke klase žive u `DataTable`, ne u
 * potrošačima.
 *
 * 2026-11-09, mjerenje nad IZVORNIM `<thead><tr>` klasama svih 8 dashboard tabela
 * (prije migracije na `DataTable`):
 *
 *   `text-xs uppercase text-slate-500`  →  Loyalty, Salon (radno vrijeme),
 *                                           Salon (praznici), Services, Users   = 5
 *   bez njega                           →  expense, income, Notifications       = 3
 *
 * Dominantni obrazac je uzglavlje s `text-xs uppercase`, pa je to sada default.
 * Vlasnik je potvrdio: „konzistentnost na dashboardima uvijek se mora ispoštovati;
 * jedini izuzetak su javne klijentske stranice." Lokalne varijante se dakle ne
 * čuvaju propom — prop postoji samo uz funkcionalni razlog.
 *
 * Ovaj test je i regresiona zaštita za grešku napravljenu pri pilot migraciji:
 * `Loyalty.tsx` je izvorno imao `text-xs uppercase text-slate-500` na uzglavlju i
 * migracija ga je tiho skinula. Sada je to default i ne može se izgubiti po fajlu.
 */

const HEAD_ROW = 'border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800'
const BODY_ROW = 'border-b border-slate-100 dark:border-slate-800/80'

test('uzglavlje i redovi nose zajedničke klase kao default komponente', () => {
  assert.ok(
    dataTable.includes(`<tr className="${HEAD_ROW}">`),
    '<thead><tr> mora imati zajedničke klase hardkodovane u komponenti',
  )
  assert.ok(
    dataTable.includes(`'${BODY_ROW}'`),
    '<tbody><tr> mora imati zajedničke klase kao default kroz cn()',
  )

  // Pozitivna kontrola: obrazac zaista hvata odstupanje. Da je uzglavlje vraćeno
  // na varijantu bez uppercase-a, asertacija iznad bi pala.
  const varijanta = '<tr className="border-b border-slate-200 text-left dark:border-slate-800">'
  assert.ok(!varijanta.includes(HEAD_ROW), 'kontrola: varijanta bez uppercase NE prolazi')
})

test('font-medium je default uzglavlja, ne po koloni', () => {
  // IZMJERENO 2026-11-09 nad izvornim markupom svih 7 dashboard tabela:
  // 36 <th>, svih 36 s `font-medium`. Bez ovog defaulta migracija tiho skida
  // bold s kolona koje koriste `align` umjesto ručne klase (trajalo je 3 kolone
  // u Services prije nego je uhvaćeno).
  const th = dataTable.match(/<th\b[\s\S]*?className=\{cn\(([^)]*)\)\}/)
  assert.ok(th, '<th> mora imati className kroz cn()')
  assert.match(th[1], /'font-medium'/, '<th> mora imati font-medium kao prvi default')

  // `<td>` NE smije naslijediti font-medium — originalne ćelije su ga imale samo
  // tamo gdje je bio potreban (npr. naziv usluge).
  const td = dataTable.match(/<td\b[\s\S]*?className=\{cn\(([^)]*)\)\}/)
  assert.ok(td, '<td> mora imati className kroz cn()')
  assert.ok(!/'font-medium'/.test(td[1]), '<td> ne smije imati font-medium kao default')
})

test('headRowClassName je uklonjen — lokalne varijante uzglavlja se ne čuvaju', () => {
  assert.equal(
    (dataTable.match(/headRowClassName/g) || []).length,
    0,
    'data-table.tsx ne smije više primati headRowClassName',
  )
  for (const [name, src] of consumers()) {
    assert.equal(
      (src.match(/headRowClassName/g) || []).length,
      0,
      `${name}: headRowClassName je uklonjen iz komponente, ne smije se koristiti`,
    )
  }
})

/**
 * Jedini prihvaćeni stil-propovi su oni s funkcionalnim razlogom. Sve ostalo je
 * nekonzistentnost i mora se preseliti u default ili ukloniti.
 */
const ALLOWED = {
  'features/finance/expense/expense-table.tsx': {
    unsortedIndicator: 1,
    rowClassName: 1,
  },
  'features/finance/income/income-entries-table.tsx': {
    unsortedIndicator: 1,
    rowClassName: 1,
  },
  'pages/Salon.tsx': {
    rowClassName: 1,
  },
}

test('nijedan potrošač ne donosi sopstveni stil tabele bez dokumentovanog razloga', () => {
  const found = consumers()
  assert.ok(found.length >= 8, `očekivano najmanje 8 potrošača, nađeno ${found.length}`)

  for (const [name, src] of found) {
    const allowed = ALLOWED[name] ?? {}
    for (const prop of ['tableClassName', 'rowClassName', 'unsortedIndicator']) {
      const count = (src.match(new RegExp(`${prop}=`, 'g')) || []).length
      assert.equal(
        count,
        allowed[prop] ?? 0,
        `${name}: ${prop} se koristi ${count}×, a dozvoljeno ${allowed[prop] ?? 0}`,
      )
    }
  }

  // Pozitivna kontrola: da neko doda tableClassName u Loyalty, gornja petlja pada.
  const kontrola = ALLOWED['pages/Loyalty.tsx'] ?? {}
  assert.equal(kontrola.tableClassName, undefined, 'kontrola: Loyalty nema izuzetaka')
})

test('svaki potrošač daje tabeli pristupačno ime preko caption propa', () => {
  for (const [name, src] of consumers()) {
    const uses = (src.match(/<DataTable\b/g) || []).length
    const captions = (src.match(/caption=\{t\('[^']+'\)\}/g) || []).length
    assert.equal(captions, uses, `${name}: ${uses}× <DataTable>, ${captions}× caption prop`)
  }
})

/** Svi `.tsx` u `src/` koji koriste `<DataTable`, osim same komponente. */
function consumers() {
  const out = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry)
      if (statSync(abs).isDirectory()) {
        walk(abs)
      } else if (entry.endsWith('.tsx') && entry !== 'data-table.tsx') {
        const src = read(abs)
        if (src.includes('<DataTable')) out.push([relative(SRC, abs).replaceAll('\\', '/'), src])
      }
    }
  }
  walk(SRC)
  return out.sort((a, b) => a[0].localeCompare(b[0]))
}
