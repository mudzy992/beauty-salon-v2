import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./pages/stylist-schedule-page.tsx', import.meta.url), 'utf8')

test('stylist schedule announces initial and refresh loading independently from the empty state', () => {
  assert.match(source, /isFetching \? \([\s\S]*?role="status" aria-live="polite"[\s\S]*?t\('common\.loading'\)/)
  assert.match(source, /const empty = !isLoading && !error && reservations\.length === 0/)
  assert.match(source, /const \{ reservations, isLoading, isFetching, error, refetch \}/)
})

test('schedule refresh action is marked busy and its errors keep a separate retry action', () => {
  assert.match(source, /onClick=\{\(\) => refetch\(\)\}[\s\S]*?disabled=\{isFetching\}[\s\S]*?aria-busy=\{isFetching\}/)
  assert.match(source, /error \? \([\s\S]*?role="alert"[\s\S]*?void refetch\(\)/)
})
