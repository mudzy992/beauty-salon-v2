import { expect, test } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const dashboard = {
  fromDate: '2026-01-01', toDate: '2026-01-31', monthlyFinance: [{ year: 2026, month: 1, label: '2026-01', income: 100, expenses: 30, tips: 5 }],
  stylistPerformance: [{ stylistProfileId: 'stylist-one', stylistName: 'Fixture Stylist', completedCount: 2, revenue: 100, tips: 5 }],
  topServices: [{ serviceId: 'service-one', serviceName: 'Fixture Service', count: 2, revenue: 100 }], conversionRate: 50, totalPending: 2, totalCompleted: 2,
  periodFinance: { servicesRevenue: 95, tips: 5, totalIncome: 100, expensesByCategory: [{ categoryId: 'category-one', categoryName: 'Fixture category', total: 30 }], totalExpenses: 30, netProfit: 70 },
}
for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`analytics composition preserves filter, retry, chart and link ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
      let count = 0, release!: () => void
      const gate = new Promise<void>(resolve => { release = resolve })
      const queries: string[] = []
      await page.route('**/api/**', async route => {
        const url = new URL(route.request().url())
        if (url.pathname === '/api/settings/public') return route.fulfill({ json: [] })
        if (url.pathname === '/api/users/profile') return route.fulfill({ json: profile })
        if (url.pathname === '/api/analytics/dashboard') {
          queries.push(url.search)
          if (++count === 2) { await gate; return route.fulfill({ status: 500, json: {} }) }
          return route.fulfill({ json: dashboard })
        }
        return route.fulfill({ json: {} })
      })
      try {
        await page.goto('/admin/analytics', { waitUntil: 'networkidle' })
        await expect(page.getByText('Fixture category')).toBeVisible()
        const stylist = page.getByRole('link', { name: 'Fixture Stylist' })
        const href = await stylist.getAttribute('href')
        const link = new URL(href!, 'https://example.test')
        expect(link.pathname).toBe('/admin/analytics')
        expect(Object.fromEntries(link.searchParams)).toMatchObject({ tab: 'stylists', stylistId: 'stylist-one', fromDate: '2026-01-01', toDate: '2026-01-31' })
        await page.locator('#analytics-period').selectOption('custom')
        await page.locator('#analytics-from').fill('2026-03-01')
        await page.locator('#analytics-to').fill('2026-03-31')
        const apply = page.getByRole('button', { name: language === 'bs' ? 'Primijeni' : 'Apply', exact: true })
        await apply.click()
        await expect.poll(() => count).toBe(2)
        await expect(page.getByRole('status').filter({ hasText: language === 'bs' ? 'Učitavanje' : 'Loading' })).toBeVisible()
        await expect(page.locator('#analytics-from')).toHaveValue('2026-03-01')
        await expect(page.locator('#analytics-to')).toHaveValue('2026-03-31')
        release()
        const alert = page.getByRole('alert')
        await expect(alert).toBeVisible()
        await expect(page.locator('#analytics-from')).toHaveValue('2026-03-01')
        await alert.getByRole('button', { name: language === 'bs' ? 'Pokušaj ponovo' : 'Try again' }).click()
        await expect(page.getByText('Fixture category')).toBeVisible()
        expect(queries).toHaveLength(3)
        expect(queries[2]).toBe(queries[1])
        await expect(page.locator('#analytics-period')).toHaveValue('custom')
        await expect(page.locator('#analytics-from')).toHaveValue('2026-03-01')
        await page.getByText(language === 'bs' ? 'Prikaži podatke grafa u tabeli' : 'Show chart data as a table').click()
        const chartTable = page.getByRole('table', { name: language === 'bs' ? 'Mjesečni prihodi, rashodi, napojnice i neto koji stoje iza grafa.' : 'Monthly revenue, expenses, tips, and net behind the chart.' })
        await expect(chartTable).toContainText(/100[,.]00/)
        await expect(chartTable).toContainText(/75[,.]00/)
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
      } finally { release() }
    })
  }
}
