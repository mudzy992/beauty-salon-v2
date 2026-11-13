import test from 'node:test'
import assert from 'node:assert/strict'
import { dashboardSourceValid as valid } from './dashboard-source-validation.mjs'

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
