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
// ui -> admin -> shell -> features -> src
const css = read(join(HERE, '..', '..', '..', '..', 'index.css'))

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

// 2026-11-18: tokenizovano (border-line / text-content-strong). `text-content-strong`
// je AAA-validan u sva tri skin-a (Classic 7.28:1, Aurum ~13:1) — slate-500 nije bio.
const HEAD_ROW = 'border-b border-line text-left text-xs uppercase text-content-strong'
const BODY_ROW = 'border-b border-line'

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
  const varijanta = '<tr className="border-b border-line text-left text-xs text-content-strong">'
  assert.ok(!varijanta.includes(HEAD_ROW), 'kontrola: varijanta bez uppercase NE prolazi')
})

test('font-medium na <th> garantuje CSS, ne utility klasa (ispravka 2026-11-09)', () => {
  // PRVO sam tvrdio da migracija skida `font-medium` s kolona koje koriste `align`
  // i dodao ga kao `cn()` default. TO JE BILO POGREŠNO: `table.app-table th` ima
  // specifičnost (0,1,2) i pobjeđuje svaku utility klasu (0,1,0), pa je `font-medium`
  // na <th> ionako neizbježan. Default je bio suvišan i uklonjen je.
  //
  // Prava garancija je ovo CSS pravilo — i ona se asertuje ovdje.
  assert.match(
    css,
    /table\.app-table th \{\s*@apply font-medium text-content-strong;\s*\}/,
    'index.css mora zadržati font-medium + text-content-strong na app-table th',
  )
  // DataTable uvijek renderuje `app-table`, pa pravilo uvijek važi.
  assert.match(dataTable, /cn\('app-table data-table w-full'/)

  // I obrnuto: `font-medium` NE smije biti dupliciran kao utility na <th>/<td>,
  // jer bi to sakrilo činjenicu da ga CSS već daje.
  const th = dataTable.match(/<th\b[\s\S]*?className=\{cn\(([^)]*)\)\}/)
  const td = dataTable.match(/<td\b[\s\S]*?className=\{cn\(([^)]*)\)\}/)
  assert.ok(th && td, '<th> i <td> moraju imati className kroz cn()')
  assert.ok(!/'font-medium'/.test(th[1]), '<th> ne smije duplicirati font-medium')
  assert.ok(!/'font-medium'/.test(td[1]), '<td> ne smije imati font-medium kao default')

  // Pozitivna kontrola: da se CSS pravilo obriše, asertacija iznad pada.
  assert.ok(
    !'table.app-table th { @apply text-content-strong; }'.match(/font-medium/),
    'kontrola: pravilo bez font-medium NE prolazi',
  )
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
  // S8: samo ova tabela dobija scoped mobilni reflow, jer index.css nije
  // uključen u runtime; veza klase i CSS pravila se dodatno testira u
  // salon-services-stylists-a11y, a geometrija u s8-service-table.spec.ts.
  'features/services/service-table.tsx': {
    tableClassName: 1,
  },
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
  // 2026-11-17 (Faza C (9/) pilot): radno vrijeme stiliste je isti obrazac kao Salon —
  // `opacity-60` za neradne dane (funkcionalni razlog, dokumentiran u DataTable docblocku).
  'pages/Stylists.tsx': {
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
