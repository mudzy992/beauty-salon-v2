import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const analytics = (name: string) => ({
  fromDate: null, toDate: null,
  user: { id: 'client-one', username: 'client-one', email: null, firstName: name, lastName: 'Client', phone: null, isActive: true, createdAt: '2026-01-01T00:00:00Z', userRoles: [] },
  stats: { totalReservations: 1, completedReservations: 1, cancelledReservations: 0, noShowCount: 0, totalSpent: 42, manualEntryCount: 0, manualSpent: 0, avgServiceRating: 5, reviewCount: 1 },
  penalty: { cancellationCount: 0, penaltyUntil: null, isPenalized: false }, topServices: [], manualEntries: [],
  reservations: [{ id: 'reservation', reservationDate: '2026-01-15', startTime: '10:00', endTime: '11:00', status: 'COMPLETED', clientNotes: 'Reservation note', cancelReason: null, cancelledAt: null, service: { id: 'service', name: 'Fixture service', price: 42 } }],
  reviews: [{ id: 'review', serviceRating: 5, stylistRating: 4, comment: 'Fixture review', isApproved: true, createdAt: '2026-01-16T12:00:00Z', service: { name: 'Fixture service' } }],
})
const debt = (name: string) => [{ id: name, amount: 15, createdAt: '2026-01-16T12:00:00Z', status: 'OPEN', service: { id: 'service', name } }]
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
  test(`stale analytics and debt ${oldStatus} cannot overwrite the selected period`, async ({ page }) => {
    await setup(page)
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    let oldAnalytics = false, oldDebt = false, debtCalls = 0
    await page.route('**/api/users/client-one/analytics**', async route => {
      const url = new URL(route.request().url())
      if (!url.searchParams.has('fromDate')) {
        oldAnalytics = true
        await gate
        return route.fulfill(oldStatus === 200 ? { json: analytics('Old') } : { status: 500, json: {} })
      }
      expect(url.searchParams.get('fromDate')).toBe('2026-01-01')
      expect(url.searchParams.get('toDate')).toBe('2026-01-31')
      return route.fulfill({ json: analytics('New') })
    })
    await page.route('**/api/client-debts?**', async route => {
      debtCalls++
      if (debtCalls === 1) {
        oldDebt = true
        await gate
        return route.fulfill(oldStatus === 200 ? { json: debt('Old debt') } : { status: 500, json: {} })
      }
      return route.fulfill({ json: debt('New debt') })
    })
    await page.goto('/admin/analytics?tab=clients&userId=client-one', { waitUntil: 'domcontentloaded' })
    await expect.poll(() => oldAnalytics && oldDebt).toBe(true)
    await page.locator('#client-from').fill('2026-01-01')
    await page.locator('#client-to').fill('2026-01-31')
    await page.getByRole('button', { name: /apply period/i }).click()
    await expect(page).toHaveURL(/tab=clients.*userId=client-one.*fromDate=2026-01-01.*toDate=2026-01-31/)
    await expect(page.getByRole('heading', { name: 'New Client' })).toBeVisible()
    await page.getByRole('tab', { name: /debts/i }).click()
    await expect(page.getByText('New debt', { exact: false })).toBeVisible()
    const oldA = page.waitForResponse(response => response.url().includes('/users/client-one/analytics') && !new URL(response.url()).searchParams.has('fromDate'))
    const oldD = page.waitForResponse(response => response.url().includes('/client-debts?'))
    release()
    await Promise.all([oldA, oldD])
    await expect(page.getByRole('heading', { name: 'New Client' })).toBeVisible()
    await expect(page.getByText('New debt', { exact: false })).toBeVisible()
    await expect(page.getByText('Old debt', { exact: false })).toHaveCount(0)
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
}

test('analytics and debt failures are distinct and both recover through retry', async ({ page }) => {
  await setup(page)
  let analyticsCalls = 0, debtCalls = 0
  await page.route('**/api/users/client-one/analytics**', route => {
    analyticsCalls++
    return route.fulfill(analyticsCalls === 1 ? { status: 500, json: {} } : { json: analytics('New') })
  })
  await page.route('**/api/client-debts?**', route => {
    debtCalls++
    return route.fulfill(debtCalls <= 2 ? { status: 500, json: {} } : { json: debt('Recovered debt') })
  })
  await page.goto('/admin/analytics?tab=clients&userId=client-one', { waitUntil: 'networkidle' })
  let alert = page.getByRole('alert')
  await expect(alert).toContainText('Could not load client analytics.')
  await alert.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('heading', { name: 'New Client' })).toBeVisible()
  await page.getByRole('tab', { name: /debts/i }).click()
  alert = page.getByRole('alert')
  await expect(alert).toContainText(/could not load debts/i)
  await alert.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('heading', { name: 'New Client' })).toBeVisible()
  await page.getByRole('tab', { name: /debts/i }).click()
  await expect(page.getByText('Recovered debt', { exact: false })).toBeVisible()
  expect(analyticsCalls).toBe(3)
  expect(debtCalls).toBe(3)
})

for (const width of [320, 1280]) {
  test(`client details restore focus and retain review rating at ${width}px`, async ({ page }) => {
    await setup(page)
    await page.setViewportSize({ width, height: 800 })
    await page.route('**/api/users/client-one/analytics**', route => route.fulfill({ json: analytics('New') }))
    await page.route('**/api/client-debts?**', route => route.fulfill({ json: [] }))
    await page.goto('/admin/analytics?tab=clients&userId=client-one', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'New Client' })).toBeVisible()
    await expect(page.locator('h1')).toHaveCount(1)
    const details = page.getByRole('button', { name: 'Details', exact: true })
    await details.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('Reservation note')
    await page.keyboard.press('Escape')
    await expect(details).toBeFocused()
    await page.getByRole('tab', { name: /reviews/i }).click()
    const review = page.getByRole('button', { name: /fixture service/i })
    await review.focus()
    await page.keyboard.press('Enter')
    await expect(dialog).toContainText('Fixture review')
    await expect(dialog.getByRole('img', { name: /5.*5/ })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(review).toBeFocused()
  })
}

for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`client summary and all extracted panels preserve data ${language} ${width}`, async ({ page }) => {
      await setup(page, language)
      await page.setViewportSize({ width, height: 800 })
      const populated = {
        ...analytics('New'),
        stats: { ...analytics('New').stats, totalSpent: 57, manualEntryCount: 1, manualSpent: 15 },
        topServices: [{ name: 'Top Fixture', count: 2, totalSpent: 42 }],
        manualEntries: [{ id: 'entry', date: '2026-01-15', actualPrice: 15, tipAmount: 3, isManual: true, notes: 'Manual fixture note', status: 'COMPLETED', service: { id: 'manual', name: 'Manual fixture service', price: 15 }, stylistProfile: { user: { firstName: 'Jane', lastName: 'Fixture', username: 'jane' } } }],
      }
      await page.route('**/api/users/client-one/analytics**', route => route.fulfill({ json: populated }))
      await page.route('**/api/client-debts?**', route => route.fulfill({ json: debt('Fixture debt') }))
      await page.goto('/admin/analytics?tab=clients&userId=client-one', { waitUntil: 'networkidle' })
      await expect(page.locator('h1')).toHaveCount(1)
      await expect(page.getByRole('heading', { name: 'New Client' })).toBeVisible()
      const summary = page.getByRole('table', { name: language === 'en' ? /spending by service/i : /tabela potrosnje po uslugama/i })
      await expect(summary).toContainText('Top Fixture')
      await expect(summary).toContainText('42')
      await expect(page.getByText('100%', { exact: true })).toBeVisible()
      const reservations = page.getByRole('table', { name: language === 'en' ? /client reservations:/i : /tabela rezervacija klijenta/i })
      await expect(reservations).toContainText('Fixture service')
      const tableAxe = await new AxeBuilder({ page }).include('table').withRules(['table-duplicate-name', 'th-has-data-cells', 'td-headers-attr']).analyze()
      expect(tableAxe.violations).toEqual([])
      await page.getByRole('tab', { name: language === 'en' ? /manual income/i : /manuelni prihodi/i }).click()
      const manual = page.getByRole('table', { name: language === 'en' ? /manual entries:/i : /tabela rucnih unosa/i })
      for (const text of ['Manual fixture service', 'Jane Fixture', 'Manual fixture note', '15', '3']) await expect(manual).toContainText(text)
      await page.getByRole('tab', { name: language === 'en' ? /reviews/i : /recenzije/i }).click()
      await expect(page.getByText('Fixture review')).toBeVisible()
      await page.getByRole('tab', { name: language === 'en' ? /debts/i : /dugovanja/i }).click()
      await expect(page.getByText('Fixture debt', { exact: false })).toBeVisible()
      await page.locator('#client-from').fill('2026-02-01')
      await page.locator('#client-to').fill('2026-01-01')
      await expect(page.getByRole('button', { name: language === 'en' ? 'Apply period' : 'Primijeni period' })).toBeDisabled()
      await expect(page.getByRole('alert')).toBeVisible()
    })
  }
}
