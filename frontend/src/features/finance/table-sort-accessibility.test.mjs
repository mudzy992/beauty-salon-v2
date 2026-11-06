import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const income = readFileSync(new URL('./income/income-entries-table.tsx', import.meta.url), 'utf8')
const expense = readFileSync(new URL('./expense/expense-table.tsx', import.meta.url), 'utf8')

for (const [name, source] of [['KIF', income], ['KUF', expense]]) {
  test(`${name} sortable headers expose the current sort direction`, () => {
    assert.match(source, /aria-sort=\{\s*sortField === column\.field\s*\? sortDirection === 'asc'\s*\? 'ascending'\s*:\s*'descending'\s*:\s*undefined\s*\}/)
    assert.match(source, /onClick=\{\(\) => onSort\(column\.field\)\}/)
    assert.match(source, /sortField === column\.field \? \([\s\S]*?aria-hidden="true"/)
  })
}
