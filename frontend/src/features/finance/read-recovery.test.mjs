import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = (relativePath) => readFile(new URL(relativePath, import.meta.url), 'utf8')

test('debt list distinguishes fetch failure from an empty result and supports retry', async () => {
  const page = await source('../../pages/Debtors.tsx')
  assert.match(page, /query\.isError\s*\?\s*\(/)
  assert.match(page, /<ErrorState onRetry=\{\(\) => void query\.refetch\(\)\}/)
  assert.match(page, /: filtered\.length === 0 \? \(/)
})

test('income integrity panel renders a recoverable error instead of an endless skeleton', async () => {
  const panel = await source('./income/integrity-panel.tsx')
  const detail = await source('./income/income-book-detail.tsx')
  assert.match(panel, /if \(isError \|\| !report\)/)
  assert.match(panel, /<ErrorState onRetry=\{onRetry\}/)
  assert.match(detail, /isError=\{integrityQuery\.isError\}/)
  assert.match(detail, /onRetry=\{\(\) => void integrityQuery\.refetch\(\)\}/)
})

test('expense category loading and errors are visible and retryable without hiding expenses', async () => {
  const detail = await source('./expense/expense-book-detail.tsx')
  const dialog = await source('./expense/expense-dialog.tsx')
  assert.match(detail, /categoriesQuery\.isError/)
  assert.match(detail, /onRetry=\{\(\) => void categoriesQuery\.refetch\(\)\}/)
  assert.match(detail, /categoriesError=\{categoriesQuery\.isError\}/)
  assert.match(dialog, /onClick=\{onRetryCategories\}/)
  assert.match(dialog, /categoriesUnavailable/)
  assert.match(dialog, /categoriesUnavailable \|\|/)
})

test('client debt editor uses client-scoped query state and invalidates it after write-off', async () => {
  const page = await source('../../pages/Users.tsx')
  assert.match(page, /queryKey: \['client-debts', editUser\?\.id \?\? ''\]/)
  assert.match(page, /clientDebtsQuery\.isError/)
  assert.match(page, /clientDebtsQuery\.refetch\(\)/)
  assert.match(page, /queryClient\.invalidateQueries\(\{\s*queryKey: \['client-debts', editUser\.id\]/)
  assert.match(page, /\(clientDebtsQuery\.data \?\? \[\]\)\.length === 0/)
})
