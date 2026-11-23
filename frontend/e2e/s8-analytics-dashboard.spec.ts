import { expect, test, type Page } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const dashboard = (name: string) => ({
  fromDate: '2026-01-01', toDate: '2026-01-31', monthlyFinance: [{ year: 2026, month: 1, label: '2026-01', income: 100, expenses: 30, tips: 5 }],
  stylistPerformance: [{ stylistProfileId: 'stylist-one', stylistName: 'Fixture Stylist', completedCount: 2, revenue: 100, tips: 5 }],
  topServices: [{ serviceId: 'service-one', serviceName: 'Fixture Service', count: 2, revenue: 100 }], conversionRate: 50, totalPending: 2, totalCompleted: 2,
  periodFinance: { servicesRevenue: 95, tips: 5, totalIncome: 100, expensesByCategory: [{ categoryId: 'category-one', categoryName: name, total: 30 }], totalExpenses: 30, netProfit: 70 },
})
async function setup(page: Page) {
  await page.addInitScript(() => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', 'en') })
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    if (path === '/api/users/profile') return route.fulfill({ json: profile })
    return route.fulfill({ json: {} })
  })
}
for (const oldStatus of [200, 500]) {
  test(`stale dashboard ${oldStatus} cannot replace newer preset`, async ({ page }) => {
    await setup(page)
    let release!: () => void, count = 0
    const gate = new Promise<void>(resolve => { release = resolve })
    await page.route('**/api/analytics/dashboard**', async route => {
      const current = ++count
      if (current === 2) { await gate; return route.fulfill(oldStatus === 200 ? { json: dashboard('Old category') } : { status: 500, json: {} }) }
      return route.fulfill({ json: dashboard('New category') })
    })
    await page.goto('/admin/analytics', { waitUntil: 'networkidle' })
    await expect(page.getByText('New category')).toBeVisible()
    const period = page.locator('#analytics-period')
    await period.selectOption('thisMonth')
    await expect.poll(() => count).toBe(2)
    await period.selectOption('lastMonth')
    await expect.poll(() => count).toBe(3)
    await expect(page.getByText('New category')).toBeVisible()
    const old = page.waitForResponse(response => response.url().includes('/analytics/dashboard') && new URL(response.url()).searchParams.has('year') && count === 3)
    release()
    await old
    await expect(page.getByText('New category')).toBeVisible()
    await expect(page.getByText('Old category')).toHaveCount(0)
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
}

test('dashboard custom range, invalid response retry and chart data remain consistent', async ({ page }) => {
  await setup(page)
  const queries: string[] = []
  await page.route('**/api/analytics/dashboard**', route => {
    queries.push(new URL(route.request().url()).search)
    return route.fulfill({ json: queries.length === 2 ? { ...dashboard('Invalid'), monthlyFinance: null } : dashboard('Fixture category') })
  })
  await page.goto('/admin/analytics', { waitUntil: 'networkidle' })
  await expect(page.getByText('Fixture category')).toBeVisible()
  await expect(page.locator('h1')).toHaveCount(1)
  const period = page.locator('#analytics-period')
  await period.selectOption('custom')
  await page.locator('#analytics-from').fill('2026-03-01')
  await page.locator('#analytics-to').fill('2026-02-01')
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Apply', exact: true })).toBeDisabled()
  await page.locator('#analytics-to').fill('2026-03-31')
  expect(queries).toHaveLength(1)
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByRole('alert').getByRole('button').click()
  await expect(page.getByText('Fixture category')).toBeVisible()
  expect(new URLSearchParams(queries[2]).get('fromDate')).toBe('2026-03-01')
  expect(new URLSearchParams(queries[2]).get('toDate')).toBe('2026-03-31')
  await page.getByText('Show chart data as a table').click()
  const chart = page.getByRole('table', { name: /monthly/i })
  await expect(chart).toContainText(/75[,.]00/)
  await expect(chart).toContainText(/100[,.]00/)
})
