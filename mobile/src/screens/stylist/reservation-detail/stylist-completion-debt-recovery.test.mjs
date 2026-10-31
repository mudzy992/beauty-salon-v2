import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const hook = readFileSync(new URL('./hooks/use-reservation-complete-flow.ts', import.meta.url), 'utf8')
const modal = readFileSync(new URL('./complete-reservation-modal.tsx', import.meta.url), 'utf8')

test('completion debt reads preserve prior data and distinguish failure from an empty list', () => {
  assert.match(hook, /const \[clientDebtsError, setClientDebtsError\] = useState\(false\)/)
  assert.match(hook, /const normalized = normalizeClientDebts\(data\);\s*if \(!normalized\) throw new Error\(\)/)
  assert.match(hook, /catch \{\s*if \(generation === debtRequestGeneration\.current\) setClientDebtsError\(true\);\s*\}/)
  assert.doesNotMatch(hook, /catch \{\s*setClientDebts\(\[\]\);\s*\}/)
  assert.match(hook, /debtRequestGeneration\.current/)
  assert.match(modal, /clientDebtsError/)
  assert.match(modal, /clientDebtsLoadError/)
  assert.match(modal, /onRetryClientDebts/)
  assert.match(modal, /!clientDebtsLoading && !clientDebtsError && clientDebts\.length === 0/)
  assert.match(modal, /disabled=\{clientDebtsLoading \|\| clientDebtsError\}/)
})
