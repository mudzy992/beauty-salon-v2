import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const income = readFileSync(new URL('./income/income-entries-table.tsx', import.meta.url), 'utf8')
const expense = readFileSync(new URL('./expense/expense-table.tsx', import.meta.url), 'utf8')
const dataTable = readFileSync(new URL('../shell/admin/ui/data-table.tsx', import.meta.url), 'utf8')

/**
 * Pristupačnost sortiranja (WCAG 4.1.2 + 1.4.1).
 *
 * 2026-11-09 — obje finance tabele su prešle na dijeljenu `DataTable` komponentu, pa
 * `aria-sort`, dugme za sortiranje i `aria-hidden` strelica više nisu u ovim fajlovima.
 * Test je zato podijeljen onako kako je i odgovornost podijeljena:
 *   1. `DataTable` **jednom** dokazuje garancije (za sve potrošače),
 *   2. svaki potrošač dokazuje da stvarno **prosljeđuje** stanje i callback sortiranja —
 *      bez toga bi zaglavlja bila mrtva, iako komponenta ima ispravan markup.
 */

test('DataTable izlaže smjer sortiranja programski i daje dugmetu tekstualno ime', () => {
  // Smjer mora biti programski, ne samo strelica (1.4.1 Use of Color).
  assert.match(dataTable, /aria-sort=\{/)
  assert.match(dataTable, /'ascending'/)
  assert.match(dataTable, /'descending'/)
  // Dugme mora imati tekstualno ime, ne samo ikonu (4.1.2).
  assert.match(dataTable, /aria-label=\{t\('table\.sortBy', \{ column: t\(column\.headerKey\) \}\)}/)
  // Strelica je dekorativna — ime dolazi iz teksta dugmeta.
  assert.match(dataTable, /aria-hidden className="h-3\.5 w-3\.5/)
  // Klik mora dojaviti koju kolonu korisnik sortira.
  assert.match(dataTable, /onClick=\{\(\) => onSortChange\(column\.sortKey!\)\}/)
})

for (const [name, source, sortFields] of [
  ['KIF', income, ['date', 'serviceName', 'amount', 'tipAmount']],
  ['KUF', expense, ['createdAt', 'title', 'totalAmount']],
]) {
  test(`${name} prosljeđuje stanje i callback sortiranja u DataTable`, () => {
    assert.match(source, /<DataTable/, `${name} ne koristi DataTable`)
    assert.match(
      source,
      /sort=\{\{ key: sortField, direction: sortDirection \}\}/,
      `${name} ne prosljeđuje trenutno stanje sortiranja`,
    )
    assert.match(
      source,
      /onSortChange=\{\(key\) => onSort\(key as \w+\)\}/,
      `${name} ne prosljeđuje callback za sortiranje`,
    )
    // Svaka sortirajuća kolona mora biti prepoznata kao takva, inače je zaglavlje mrtvo.
    const sortKeys = [...source.matchAll(/sortKey: '(\w+)'/g)].map((m) => m[1])
    assert.deepEqual(sortKeys, sortFields, `${name}: sortirajuće kolone`)
  })
}
