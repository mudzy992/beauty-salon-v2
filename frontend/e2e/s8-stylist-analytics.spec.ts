import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const fixture = (name: string) => ({
  stylist: { id: 'profile-1', name, user: { id: 'user-1', username: 'jane', email: 'jane@example.test', firstName: 'Jane', lastName: 'Fixture' } },
  fromDate: '2026-01-01', toDate: '2026-01-31', completedCount: 2, revenue: 50, tips: 5,
  topServices: [{ serviceId: 's1', serviceName: 'Fixture service', count: 2, revenue: 50 }],
  recentEntries: [{ id: 'entry-1', date: '2026-01-15', serviceName: 'Fixture service', clientName: 'Fixture client', actualPrice: 25, tipAmount: 5 }],
})
async function setup(page: Page, language = 'en') {
  await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    if (path === '/api/users/profile') return route.fulfill({ json: profile })
    return route.fulfill({ json: {} })
  })
}

for (const oldStatus of [200, 500]) {
  test(`stale stylist analytics ${oldStatus} cannot replace applied period`, async ({ page }) => {
    await setup(page)
    let release!: () => void, started = false
    const gate = new Promise<void>(resolve => { release = resolve })
    await page.route('**/api/stylists/profile-1/analytics**', async route => {
      const params = new URL(route.request().url()).searchParams
      if (!params.has('fromDate')) {
        started = true
        await gate
        return route.fulfill(oldStatus === 200 ? { json: fixture('Old Stylist') } : { status: 500, json: {} })
      }
      expect(params.get('fromDate')).toBe('2026-02-01')
      expect(params.get('toDate')).toBe('2026-02-28')
      return route.fulfill({ json: fixture('New Stylist') })
    })
    await page.goto('/admin/analytics?tab=stylists&stylistId=profile-1', { waitUntil: 'domcontentloaded' })
    await expect.poll(() => started).toBe(true)
    await page.locator('#stylist-from').fill('2026-02-01')
    await page.locator('#stylist-to').fill('2026-02-28')
    await page.getByRole('button', { name: /loading/i }).click()
    await expect(page.getByRole('heading', { name: 'New Stylist' })).toBeVisible()
    const old = page.waitForResponse(response => response.url().includes('/stylists/profile-1/analytics') && !new URL(response.url()).searchParams.has('fromDate'))
    release()
    await old
    await expect(page.getByRole('heading', { name: 'New Stylist' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Old Stylist' })).toHaveCount(0)
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
}

for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`stylist period identity, retry and named tables ${language} ${width}`, async ({ page }) => {
      await setup(page, language)
      await page.setViewportSize({ width, height: 800 })
      const requests: string[] = []
      await page.route('**/api/stylists/profile-1/analytics**', route => {
        requests.push(new URL(route.request().url()).search)
        const data = fixture('Fixture Stylist')
        return route.fulfill({ json: requests.length === 2 ? { ...data, stylist: { ...data.stylist, id: 'wrong-id', name: 'Wrong Stylist' } } : data })
      })
      await page.goto('/admin/analytics?tab=stylists&stylistId=profile-1&fromDate=2026-01-01&toDate=2026-01-31', { waitUntil: 'networkidle' })
      await expect(page.getByRole('heading', { name: 'Fixture Stylist' })).toBeVisible()
      await expect(page.locator('h1')).toHaveCount(1)
      expect(new URLSearchParams(requests[0]).get('fromDate')).toBe('2026-01-01')
      const table1 = page.getByRole('table', { name: language === 'en' ? 'Top services' : 'Top usluge' })
      const table2 = page.getByRole('table', { name: language === 'en' ? 'Recent entries' : 'Posljednji unosi' })
      await expect(table1).toContainText('Fixture service')
      await expect(table2).toContainText('Fixture client')
      const axe = await new AxeBuilder({ page }).include('table').withRules(['table-duplicate-name', 'th-has-data-cells', 'td-headers-attr']).analyze()
      expect(axe.violations).toEqual([])
      await page.locator('#stylist-from').fill('2026-03-01')
      await expect(page.getByRole('button', { name: language === 'en' ? 'Apply period' : 'Primijeni period' })).toBeDisabled()
      await page.locator('#stylist-to').fill('2026-03-31')
      expect(requests).toHaveLength(1)
      await page.getByRole('button', { name: language === 'en' ? 'Apply period' : 'Primijeni period' }).click()
      await expect(page.getByRole('alert')).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Wrong Stylist' })).toHaveCount(0)
      await expect(page.locator('h1')).toHaveCount(1)
      await page.getByRole('alert').getByRole('button').click()
      await expect(page.getByRole('heading', { name: 'Fixture Stylist' })).toBeVisible()
      expect(new URLSearchParams(requests[2]).get('fromDate')).toBe('2026-03-01')
      expect(new URLSearchParams(requests[2]).get('toDate')).toBe('2026-03-31')
    })
  }
}
