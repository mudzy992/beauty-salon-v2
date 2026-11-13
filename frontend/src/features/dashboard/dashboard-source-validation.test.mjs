import test from 'node:test'
import assert from 'node:assert/strict'
import { dashboardSourceValid as valid, outboxDiagnosticsValid } from './dashboard-source-validation.mjs'

test('dashboard source validation accepts real zero and rejects malformed data', () => {
  assert.equal(valid('usersCount', { total: 0 }), true)
  assert.equal(valid('usersCount', {}), false)
  assert.equal(valid('services', { total: -1 }), false)
  assert.equal(valid('services', { total: 0 }), true)
  assert.equal(valid('incomeBook', { totalRevenue: '0', totalTips: 0 }), true)
  assert.equal(valid('incomeBook', { totalRevenue: 'abc', totalTips: 0 }), false)
  assert.equal(valid('incomeBook', null), false)
  assert.equal(valid('expenseBook', { expenses: [] }), true)
  assert.equal(valid('expenseBook', { expenses: [{ totalAmount: '' }] }), false)
  assert.equal(valid('reviews', {}), false)
  const summary = { reservationsThisMonth: 0, completedReservations: 0, pendingReservations: 0, recentReservations: [] }
  assert.equal(valid('reservationSummary', summary), true)
  assert.equal(valid('reservationSummary', { ...summary, recentReservations: [{ id: 'x' }] }), false)
})


test('outbox permits absent status counts but rejects malformed diagnostic data', () => {
  const data = { generatedAt: '2026-01-01T00:00:00Z', counts: {}, duePending: 0, staleProcessing: 0, recentEvents: [] }
  assert.equal(outboxDiagnosticsValid(data), true)
  assert.equal(outboxDiagnosticsValid({ ...data, counts: { PENDING: -1 } }), false)
  assert.equal(outboxDiagnosticsValid({ ...data, recentEvents: [{ status: 'DEAD_LETTER' }] }), false)
  assert.equal(outboxDiagnosticsValid({ ...data, recentEvents: [{ id: 'a', eventType: 'test', status: 'PENDING', attempts: 0, updatedAt: '2026-01-01T00:00:00Z', lastError: null }] }), true)
})
