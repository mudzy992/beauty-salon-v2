import { expect, test } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const category = { id: 'cat', name: 'Category fixture', isActive: true, sortOrder: 0 }
const subcategory = { id: 'sub', categoryId: 'cat', name: 'Subcategory fixture', isActive: true, sortOrder: 0 }
const service = { id: 'svc', name: 'Service fixture', subcategoryId: 'sub', durationMinutes: 30, price: 30, gender: 'FEMALE', isActive: true, sortOrder: 0, heroImage: null, shortDescription: null }
const impact = {
  service: { id: 'svc', name: 'Service fixture', imageRetained: true }, target: null,
  reservations: { primary: 0, additionalServiceItems: 0 }, dailyLogs: { primary: 0, completed: 0, additionalServiceItems: 0, debtPaymentEntries: 0 },
  income: { automaticEntries: 0, automaticRevenue: 0, automaticTips: 0, manualEntries: 0, manualRevenue: 0, manualTips: 0 },
  debts: { count: 0, openCount: 0, amount: 0, openAmount: 0 }, images: { dailyLogImages: 0, consentRecordsRetained: 0 },
  reviews: 0, stylistLinks: 0, pendingOutboxEvents: 0, duplicateStylistLinks: 0,
  mergeConflicts: { reservationItems: 0, dailyLogItems: 0, dailyLogReservations: 0, reviews: 0, processingOutboxEvents: 0 }, impactToken: 'token',
}
for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`deletion dialog restores focus on cancel and refresh ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
      let reads = 0, deletes = 0, release!: () => void
      const gate = new Promise<void>(resolve => { release = resolve })
      await page.route('**/api/**', async route => {
        const req = route.request(), path = new URL(req.url()).pathname
        if (path === '/api/settings/public') return route.fulfill({ json: [] })
        if (path === '/api/users/profile') return route.fulfill({ json: profile })
        if (path === '/api/services/admin/categories') { if (++reads === 2) await gate; return route.fulfill({ json: [category] }) }
        if (path === '/api/services/admin/subcategories') return route.fulfill({ json: [subcategory] })
        if (path === '/api/services/admin/services') return route.fulfill({ json: deletes ? [] : [service] })
        if (path === '/api/services/admin/services/svc/deletion-impact') return route.fulfill({ json: impact })
        if (path === '/api/services/svc' && req.method() === 'DELETE') { deletes++; return route.fulfill({ json: {} }) }
        return route.fulfill({ json: {} })
      })
      try {
        await page.goto('/admin/services', { waitUntil: 'networkidle' })
        await page.getByRole('button', { name: /Category fixture/, expanded: false }).click()
        const opener = page.getByRole('button', { name: `${language === 'bs' ? 'Obriši uslugu' : 'Delete service'}: Service fixture` })
        await opener.focus(); await page.keyboard.press('Enter')
        let dialog = page.getByRole('dialog')
        await expect(dialog.locator('#service-delete-confirmation')).toBeVisible()
        await dialog.getByRole('button', { name: language === 'bs' ? 'Odustani' : 'Cancel', exact: true }).click()
        await expect(dialog).toBeHidden()
        await expect(opener).toBeFocused()
        expect(deletes).toBe(0)
        await page.keyboard.press('Enter')
        dialog = page.getByRole('dialog')
        await dialog.locator('#service-delete-confirmation').fill('Service fixture')
        const confirm = dialog.getByRole('button', { name: language === 'bs' ? 'Trajno obriši sve povezano' : 'Permanently delete all linked data', exact: true })
        await expect(confirm).toBeEnabled()
        await confirm.click()
        await expect.poll(() => reads).toBe(2)
        await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
        await page.getByRole('banner').getByRole('link').first().focus()
        release()
        await expect(page.getByRole('button', { name: /Category fixture/, expanded: false })).toBeVisible()
        await expect(page.getByRole('banner').getByRole('link').first()).toBeFocused()
        expect(deletes).toBe(1)
      } finally { release() }
    })
  }
}
