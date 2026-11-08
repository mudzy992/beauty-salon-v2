import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Summary parity — zbirovi na ekranu moraju izlaziti na isto kao zbir dijelova.
 *
 * Zašto postoji: `SummaryCards` prikazuje tri kartice za KIF (prihod, napojnica,
 * ukupno naplaćeno) i dvije za KUF (ukupni rashodi, filtrirano). Ako se `total`
 * računa drugim putem nego `revenue + tips`, operater vidi broj koji se ne
 * slaže sa sabircima pored njega — a to se ne primijeti dok neko ne sabere ručno.
 *
 * Test **izvršava** stvarne helpere (`summarizeIncomeRows`, `sumExpenses`) preko
 * esbuild bundle-a. Nijedna formula nije reimplementirana ovdje.
 */
const here = dirname(fileURLToPath(import.meta.url))
const frontendRoot = join(here, '..', '..', '..')
const cacheDir = join(frontendRoot, 'node_modules', '.cache', 'finance-summary-parity')

const ENTRY = `
export { summarizeIncomeRows } from './income/income-entries.helpers'
export { sumExpenses } from './expense/expenses.helpers'
`

const loadModules = async () => {
  const result = await build({
    stdin: {
      contents: ENTRY,
      resolveDir: here,
      loader: 'ts',
      sourcefile: 'finance-summary-parity-entry.ts',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    write: false,
    target: 'node18',
    logLevel: 'silent',
  })
  mkdirSync(cacheDir, { recursive: true })
  const outFile = join(cacheDir, `bundle-${process.pid}.cjs`)
  writeFileSync(outFile, result.outputFiles[0].text, 'utf8')
  return createRequire(import.meta.url)(outFile)
}

const { summarizeIncomeRows, sumExpenses } = await loadModules()

const row = (amount, tipAmount) => ({
  id: `${amount}-${tipAmount}`,
  amount,
  tipAmount,
  date: '2026-11-08',
  serviceName: 'S',
  stylistName: 'A',
  clientName: 'B',
  kind: 'SERVICE',
})

const CASES = [
  [],
  [row(100, 0)],
  [row(100, 20)],
  [row(100, 20), row(50, 5), row(0, 0)],
  [row(99.99, 0.01)],
  [row(1000, 250), row(0, 0), row(75.5, 10.25)],
]

test('ukupno naplaceno === prihod + napojnica (tri kartice izlaze na isto)', () => {
  for (const rows of CASES) {
    const s = summarizeIncomeRows(rows)
    assert.equal(
      s.total,
      s.revenue + s.tips,
      `dekompozicija ne izlazi na isto za ${rows.length} redova: ` +
        `total=${s.total} revenue+tips=${s.revenue + s.tips}`,
    )
  }
})

test('revenue i tips su zbir svojih kolona, ne nezavisan proračun', () => {
  for (const rows of CASES) {
    const s = summarizeIncomeRows(rows)
    const expectedRevenue = rows.reduce((acc, r) => acc + r.amount, 0)
    const expectedTips = rows.reduce((acc, r) => acc + r.tipAmount, 0)
    assert.equal(s.revenue, expectedRevenue, 'revenue nije zbir kolone amount')
    assert.equal(s.tips, expectedTips, 'tips nije zbir kolone tipAmount')
    assert.equal(s.count, rows.length, 'count nije broj redova')
  }
})

test('prazan skup daje nule, ne NaN ni undefined', () => {
  const s = summarizeIncomeRows([])
  assert.deepEqual(s, { revenue: 0, tips: 0, total: 0, count: 0 })
  assert.ok(Number.isFinite(s.total), 'total mora biti konačan broj')
})

test('sumExpenses je zbir totalAmount i slaze se s prikazanim filtrom', () => {
  const expenses = [
    { id: '1', totalAmount: '100.50' },
    { id: '2', totalAmount: 200 },
    { id: '3', totalAmount: '0' },
  ]
  const total = sumExpenses(expenses)
  assert.equal(total, 300.5)

  // Kartica „filtrirano" koristi isti helper nad istim podskupom — podskup
  // mora biti manji ili jednak, nikad veći od cijelog skupa.
  const subset = sumExpenses(expenses.slice(0, 2))
  assert.ok(subset <= total, `podskup ${subset} > ukupno ${total}`)
  assert.equal(subset, 300.5)
})

test('sumExpenses tolerise string iznose i prazan skup', () => {
  assert.equal(sumExpenses([]), 0)
  assert.equal(sumExpenses([{ id: 'x', totalAmount: null }]), 0)
  assert.equal(sumExpenses([{ id: 'x', totalAmount: 'abc' }]), 0)
})
