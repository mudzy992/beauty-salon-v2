import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./book-period-picker.tsx', import.meta.url), 'utf8')

test('opening a finance book announces progress and exposes the pending action', () => {
  assert.match(source, /<Button onClick=\{onOpen\} disabled=\{isPending \|\| isFuture\} aria-busy=\{isPending\}>/)
  assert.match(source, /isPending \? \([\s\S]*?role="status" aria-live="polite"[\s\S]*?finance\.states\.loading/)
})

test('the selected period cannot change while its book-opening request is pending', () => {
  const monthSelect = source.match(/id="period-month"[\s\S]*?disabled=\{isPending\}/)
  const yearSelect = source.match(/id="period-year"[\s\S]*?disabled=\{isPending\}/)
  assert.ok(monthSelect)
  assert.ok(yearSelect)
  assert.match(source, /disabled=\{isPending \|\| isFuture\}/)
})
