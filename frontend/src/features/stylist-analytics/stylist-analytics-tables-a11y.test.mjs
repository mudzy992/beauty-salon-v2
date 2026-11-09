/**
 * WCAG 1.3.1 (Info and Relationships) — tabele u `pages/StylistAnalytics.tsx`.
 *
 * Šta je bio problem (izmjereno, ne pretpostavljeno)
 * ──────────────────────────────────────────────────
 * `StylistAnalytics.tsx` je bio **jedini** fajl s `<table>` u cijelom `src/` koji nije imao
 * nijedan `scope="col"` i nijedan `<caption>` — 7 `<th>` bez veze s ćelijama, i dvije tabele
 * bez pristupačnog imena, iako je **vidljivi `<h2>`** stajao odmah iznad svake.
 *
 * (Napomena o mjerenju: `grep -c '<th'` vraća 9 jer pogodi i `<thead>`. Stvaran broj
 * `<th>` je 7 — 4 + 1 + 2 po klasama. Provjereno s `grep -o '<th[^>]*>' | sort | uniq -c`.)
 *
 * Rješenje — nula vidljivih promjena
 * ──────────────────────────────────
 * `scope="col"` na svih 7 `<th>` + `aria-labelledby` na obje tabele, usmjeren na **postojeće
 * vidljive `<h2>`**. `DataTable` namjerno NIJE upotrijebljen: on renderuje
 * `table.data-table` s `<caption className="sr-only">` i vlastitim razredima, pa bi
 * migracija promijenila izgled — a ove tabele već imaju vidljive naslove koje je dovoljno
 * povezati. Id-ovi su iz `useId()`, jer se stranica renderuje uz druge slične tabele.
 *
 * 🔴 Ograničenje: source-contract. Ne dokazuje da čitač ekrana stvarno najavi naziv tabele.
 */
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(HERE, '../..')
const read = (rel) => readFileSync(resolve(SRC, rel), 'utf8')

const page = read('pages/StylistAnalytics.tsx')

/** Otvarajući tagovi `<th …>` — bez `<thead>`, koji inače lažno uvećava brojač. */
const thTagovi = () => [...page.matchAll(/<th\s[^>]*>/g)].map((m) => m[0])

test('svaki <th> ima scope="col"', () => {
  const tagovi = thTagovi()
  assert.equal(tagovi.length, 7, `očekivano 7 <th>, nađeno ${tagovi.length}`)
  for (const tag of tagovi) {
    assert.match(tag, /scope="col"/, `<th> bez scope: ${tag}`)
  }
})

test('obje tabele imaju pristupačno ime preko postojećeg vidljivog <h2>', () => {
  const tabele = [...page.matchAll(/<table\s[^>]*>/g)].map((m) => m[0])
  assert.equal(tabele.length, 2, `očekivane 2 tabele, nađeno ${tabele.length}`)
  const imena = tabele.map((t) => /aria-labelledby=\{(\w+)\}/.exec(t)?.[1])
  assert.deepEqual(imena, ['topServicesLabelId', 'recentEntriesLabelId'])
  // Svaki naziv mora stvarno postojati kao id na <h2>
  for (const ime of imena) {
    assert.ok(page.includes(`<h2 id={${ime}}`), `${ime} nije id nijednog <h2>`)
  }
})

test('nazivi tabela su iz useId(), pa se ne sudaraju s drugim stranicama', () => {
  assert.ok(page.includes('const tablesId = useId()'))
  for (const v of ['topServicesLabelId', 'recentEntriesLabelId']) {
    assert.match(page, new RegExp('const ' + v + ' = `\\$\\{tablesId\\}-'), `${v} nije iz useId()`)
  }
})

test('nijedan aria-labelledby ne pokazuje na nepostojeći id', () => {
  const upotrebe = [...page.matchAll(/aria-labelledby=\{(\w+)\}/g)].map((m) => m[1])
  assert.ok(upotrebe.length >= 2)
  const definisani = new Set([...page.matchAll(/id=\{(\w+)\}/g)].map((m) => m[1]))
  for (const ime of upotrebe) {
    assert.ok(definisani.has(ime), `${ime} nije definisan nijednim id={…}`)
  }
})

test('tabele su ostale app-table (nije uvedena data-table migracija s vidljivim promjenama)', () => {
  const tabele = [...page.matchAll(/<table\s[^>]*>/g)].map((m) => m[0])
  for (const t of tabele) {
    assert.match(t, /className="app-table w-full border-collapse"/, `neočekivana klasa: ${t}`)
  }
  // DataTable bi dodao sr-only <caption>; ovdje je umjesto toga aria-labelledby na <h2>.
  assert.ok(!page.includes('<caption'), 'caption nije potreban — tabele imaju aria-labelledby')
  assert.ok(!page.includes('DataTable'), 'DataTable nije trebao biti uveden')
})
