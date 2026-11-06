import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./pages/stylist-debts-page.tsx', import.meta.url), 'utf8')

test('stylist debts announce initial loading separately from retryable errors and empty results', () => {
  assert.match(source, /query\.isLoading \? \([\s\S]*?role="status" aria-live="polite"[\s\S]*?t\('common\.loading'\)/)
  assert.match(source, /query\.isError \? \([\s\S]*?role="alert"[\s\S]*?void query\.refetch\(\)/)
  assert.match(source, /filtered\.length === 0 \? \([\s\S]*?noOpenDebts[\s\S]*?noSearchResults/)
})

test('debt repayment exposes a busy action and a polite progress announcement', () => {
  assert.match(source, /repaying \? \([\s\S]*?role="status" aria-live="polite"[\s\S]*?t\('common\.loading'\)/)
  assert.match(source, /onClick=\{submitRepay\} disabled=\{repaying\} aria-busy=\{repaying\}/)
})
