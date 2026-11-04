import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./use-dashboard-data.ts', import.meta.url), 'utf8')

test('dashboard reservations use a server-bounded aggregate and recent sample', () => {
  assert.match(source, /\.get<[\s\S]*?\}>\('\/api\/reservations\/dashboard-summary'/)
  assert.match(source, /params: \{ fromDate: firstDay, toDate: lastDay \}/)
  assert.match(source, /summaryCount\(reservationSummary\?\.reservationsThisMonth\)/)
  assert.match(source, /summaryCount\(reservationSummary\?\.pendingReservations\)/)
  assert.match(source, /summaryCount\(reservationSummary\?\.completedReservations\)/)
  assert.match(source, /reservationSummary\?\.recentReservations\)\.slice\(0, 8\)/)
  assert.doesNotMatch(source, /api\.get\(['"]\/api\/reservations['"]\)/)
})

test('dashboard reads an aggregate user count instead of downloading the directory', () => {
  assert.match(
    source,
    /\.get<\{ total\?: number \}>\('\/api\/users\/dashboard-count'\)/,
  )
  assert.match(source, /usersCountRes\.data\?\.total/)
  assert.doesNotMatch(source, /api\.get\(['"]\/api\/users['"]\)/)
  assert.doesNotMatch(source, /asArray\(usersCountRes\.data\)/)
})
