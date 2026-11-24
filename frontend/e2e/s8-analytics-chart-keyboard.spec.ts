import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const dashboard = {
  fromDate: '2026-01-01', toDate: '2026-02-28',
  monthlyFinance: [
    { year: 2026, month: 1, label: '2026-01', income: 100, expenses: 30, tips: 5 },
    { year: 2026, month: 2, label: '2026-02', income: 200, expenses: 60, tips: 10 },
  ],
  stylistPerformance: [], topServices: [], conversionRate: 50, totalPending: 2, totalCompleted: 2,
  periodFinance: { servicesRevenue: 285, tips: 15, totalIncome: 300, expensesByCategory: [], totalExpenses: 90, netProfit: 210 },
}
for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`chart keyboard tooltip and table are accessible ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
      await page.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname
        if (path === '/api/settings/public') return route.fulfill({ json: [] })
        if (path === '/api/users/profile') return route.fulfill({ json: profile })
        if (path === '/api/analytics/dashboard') return route.fulfill({ json: dashboard })
        return route.fulfill({ json: {} })
      })
      await page.goto('/admin/analytics', { waitUntil: 'networkidle' })
      const chart = page.getByRole('application', { name: language === 'bs' ? 'Grafikon mjesečnih finansija' : 'Monthly finances chart' })
      await expect(chart).toBeVisible()
      await expect(chart).toHaveAttribute('tabindex', '0')
      await expect(chart).toHaveAccessibleDescription(/300[,.]00/)
      await page.locator('#analytics-period').focus()
      for (let i = 0; i < 20 && !(await chart.evaluate(node => node === document.activeElement)); i++) await page.keyboard.press('Tab')
      await expect(chart).toBeFocused()
      const outline = await chart.evaluate(node => getComputedStyle(node).outlineStyle)
      expect(outline).not.toBe('none')
      const tooltip = page.locator('.recharts-tooltip-wrapper')
      await expect(tooltip).toBeVisible()
      await expect(tooltip).toContainText(/100[,.]00/)
      await page.keyboard.press('ArrowRight')
      await expect(tooltip).toContainText(/200[,.]00/)
      await page.keyboard.press('ArrowLeft')
      await expect(tooltip).toContainText(/100[,.]00/)
      await page.keyboard.press('Tab')
      const summary = page.getByText(language === 'bs' ? 'Prikaži podatke grafa u tabeli' : 'Show chart data as a table')
      await expect(summary).toBeFocused()
      await page.keyboard.press('Enter')
      const table = page.getByRole('table', { name: language === 'bs' ? 'Mjesečni prihodi, rashodi, napojnice i neto koji stoje iza grafa.' : 'Monthly revenue, expenses, tips, and net behind the chart.' })
      await expect(table).toContainText(/100[,.]00/)
      await expect(table).toContainText(/200[,.]00/)
      await expect(table).toContainText(/150[,.]00/)
      const axe = await new AxeBuilder({ page }).include('main').withRules(['nested-interactive', 'aria-allowed-attr', 'aria-required-attr', 'aria-hidden-focus']).analyze()
      expect(axe.violations).toEqual([])
    })
  }
}
