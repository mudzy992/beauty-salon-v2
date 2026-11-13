// Validate successful responses before treating their values as real metrics.
const count = value => Number.isSafeInteger(value) && value >= 0
const amount = value => (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) && Number.isFinite(Number(value))
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const catalog = value => Array.isArray(value) || (object(value) && count(value.total))

export const dashboardSourceValid = (source, data) => {
  switch (source) {
    case 'usersCount': return object(data) && count(data.total)
    case 'stylists':
    case 'services': return catalog(data)
    case 'reservationSummary':
      return object(data) && count(data.reservationsThisMonth) && count(data.completedReservations) && count(data.pendingReservations) && Array.isArray(data.recentReservations) && data.recentReservations.every(r => object(r) && typeof r.id === 'string' && typeof r.reservationDate === 'string' && typeof r.startTime === 'string' && typeof r.status === 'string' && (!r.client || (object(r.client) && typeof r.client.id === 'string')))
    case 'incomeBook': return object(data) && amount(data.totalRevenue) && amount(data.totalTips)
    case 'expenseBook': return object(data) && Array.isArray(data.expenses) && data.expenses.every(e => object(e) && amount(e.totalAmount))
    case 'reviews':
    case 'blogPosts': return Array.isArray(data)
    default: return false
  }
}

export const outboxDiagnosticsValid = data => {
  const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
  if (!object(data) || !date(data.generatedAt) || !object(data.counts) || !Object.values(data.counts).every(count) || !count(data.duePending) || !count(data.staleProcessing) || !Array.isArray(data.recentEvents)) return false
  return data.recentEvents.every(event => object(event) && typeof event.id === 'string' && typeof event.eventType === 'string' && typeof event.status === 'string' && count(event.attempts) && date(event.updatedAt) && (event.lastError === null || typeof event.lastError === 'string'))
}
