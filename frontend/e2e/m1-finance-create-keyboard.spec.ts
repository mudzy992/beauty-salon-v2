import { expect, test, type Locator, type Page } from '@playwright/test'

async function tabTo(page: Page, target: Locator, limit = 150) {
  await expect(target).toBeVisible()
  for (let i = 0; i < limit && !(await target.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
  await expect(target).toBeFocused()
}

// Synthetic create only: POST is intercepted and no real client/financial data is touched.
for (const theme of ['classic', 'light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const viewport of ['desktop', 'mobile'] as const) {
      test(`M1 manual income create ${theme} ${language} ${viewport}`, async ({ page }) => {
        await page.setViewportSize(viewport === 'desktop' ? { width: 1280, height: 900 } : { width: 390, height: 844 })
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.addInitScript(({ mode, locale }) => {
          localStorage.setItem('token', 'fixture-admin-token')
          localStorage.removeItem('nejra.theme')
          localStorage.setItem('nejra.theme.mode', mode)
          localStorage.setItem('APP_LOCALE', locale)
        }, { mode: theme === 'dark' ? 'dark' : 'light', locale: language })
        const stylist = { id: 'stylist-1', user: { username: 'ana', firstName: 'Ana', lastName: 'Test' } }
        const service = { id: 'service-1', name: 'Test usluga', price: 50 }
        const client = { id: 'client-1', username: 'klijent', firstName: 'Test', lastName: 'Klijent' }
        const book = { id: 'book-1', year: 2026, month: 3, totalRevenue: 0, totalTips: 0, openedAt: '2026-03-01T00:00:00Z', closedAt: null, entries: [], manualEntries: [], lockEvents: [], manualAudits: [] }
        const writes: { method: string; path: string; body: unknown }[] = []
        await page.route('**/api/**', route => {
          const req = route.request(), path = new URL(req.url()).pathname
          if (req.method() !== 'GET') {
            writes.push({ method: req.method(), path, body: req.postDataJSON() })
            if (req.method() === 'POST' && path === '/api/income-books/book-1/manual-entries') return route.fulfill({ json: {} })
            return route.abort()
          }
          if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_active_skin', value: theme === 'classic' ? 'classic' : 'aurum' }, { key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
          if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
          if (path === '/api/income-books') return route.fulfill({ json: [book] })
          if (path === '/api/income-books/book-1') return route.fulfill({ json: book })
          if (path === '/api/income-books/book-1/integrity') return route.fulfill({ json: { bookId: 'book-1', isLocked: false, missingCount: 0, orphanedCount: 0, isHealthy: true, missing: [], orphaned: [] } })
          if (path === '/api/stylists/admin') return route.fulfill({ json: [stylist] })
          if (path === '/api/stylists/admin/stylist-1/services') return route.fulfill({ json: [{ service }] })
          if (path === '/api/users/clients') return route.fulfill({ json: { items: [client] } })
          return route.fulfill({ json: {} })
        })
        await page.goto('/admin/finance?tab=income', { waitUntil: 'networkidle' })
        await expect(page.locator('html')).toHaveAttribute('data-skin', theme === 'classic' ? 'classic' : 'aurum')
        await expect(page.locator('html')).toHaveAttribute('lang', language)
        const bookButton = page.getByRole('button', { name: /otvori knjigu.*2026|open book.*2026/i })
        await tabTo(page, bookButton)
        await page.keyboard.press('Enter')
        const trigger = page.getByRole('button', { name: /^ručni prihod$|^manual income$/i })
        await tabTo(page, trigger)
        await page.keyboard.press('Enter')
        const dialog = page.getByRole('dialog')
        await expect(dialog).toBeVisible()
        const save = dialog.getByRole('button', { name: /^sačuvaj$|^save$/i })
        await expect(save).toBeDisabled()
        const stylistSelect = dialog.locator('#manual-stylist')
        await tabTo(page, stylistSelect, 40)
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press('Enter')
        await expect(stylistSelect).toHaveValue('stylist-1')
        const serviceSelect = dialog.locator('#manual-service')
        await expect(serviceSelect).toBeEnabled()
        await tabTo(page, serviceSelect, 40)
        await expect(serviceSelect.locator('option[value="service-1"]')).toHaveCount(1)
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press('Enter')
        await expect(serviceSelect).toHaveValue('service-1')
        const search = dialog.locator('#manual-client')
        await tabTo(page, search, 40)
        await page.keyboard.type('Test')
        const result = dialog.getByRole('button', { name: /Test Klijent/i })
        await tabTo(page, result, 40)
        await page.keyboard.press('Enter')
        const remove = dialog.getByRole('button', { name: /ukloni klijenta|remove client/i })
        await expect(remove).toBeFocused()
        await page.keyboard.press('Enter')
        await expect(search).toBeFocused()
        await expect(result).toBeVisible()
        await tabTo(page, result, 40)
        await page.keyboard.press('Enter')
        await expect(remove).toBeFocused()
        const paid = dialog.locator('#manual-paid')
        await tabTo(page, paid, 40)
        await page.keyboard.type('50')
        await expect(save).toBeEnabled()
        await tabTo(page, save, 40)
        await page.keyboard.press('Enter')
        await expect(dialog).toBeHidden()
        await expect(trigger).toBeFocused()
        expect(writes).toHaveLength(1)
        expect(writes[0]).toMatchObject({ method: 'POST', path: '/api/income-books/book-1/manual-entries', body: { serviceId: 'service-1', stylistProfileId: 'stylist-1', clientId: 'client-1', paidAmount: 50, debtHandling: 'IGNORE_DEBT' } })
      })
    }
  }
}
