import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./pages/stylist-stats-page.tsx', import.meta.url), 'utf8')

test('stylist statistics announce profile and aggregate-query loading before treating zero metrics as data', () => {
  assert.match(source, /if \(profileLoading \|\| \(reservationsQuery\.isLoading && !profileId\)\)[\s\S]*?role="status" aria-live="polite"[\s\S]*?common\.loading/)
  assert.match(source, /statsFetching \? \([\s\S]*?role="status" aria-live="polite"[\s\S]*?t\('common\.loading'\)/)
  assert.match(source, /const statsFetching = reservationsQuery\.isFetching \|\| dailyLogQuery\.isFetching/)
})

test('statistics retry is busy-aware and read failures remain distinct from numeric results', () => {
  assert.match(source, /reservationsQuery\.isError \|\| dailyLogQuery\.isError \? \([\s\S]*?role="alert"[\s\S]*?stylistPortal\.stats\.loadFailed[\s\S]*?common\.retry/)
  assert.match(source, /disabled=\{statsFetching\}[\s\S]*?aria-busy=\{statsFetching\}/)
  assert.match(source, /const totalRevenue = completedLogEntries\.reduce/)
})
