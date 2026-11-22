import { expect, test, type Locator, type Page } from '@playwright/test'

async function tabTo(page: Page, target: Locator) {
  await expect(target).toBeVisible()
  for (let i = 0; i < 150 && !(await target.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
  await expect(target).toBeFocused()
}

// Isolated synthetic edit: no save request is sent.
for (const theme of ['classic', 'light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const viewport of ['desktop', 'mobile'] as const) {
      test(`M1 income edit waits for service ${theme} ${language} ${viewport}`, async ({ page }) => {
        test.setTimeout(60_000)
        await page.setViewportSize(viewport === 'desktop' ? { width: 1280, height: 900 } : { width: 390, height: 844 })
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.addInitScript(({ mode, locale }) => {
          localStorage.setItem('token', 'fixture-admin-token')
          localStorage.removeItem('nejra.theme')
          localStorage.setItem('nejra.theme.mode', mode)
          localStorage.setItem('APP_LOCALE', locale)
        }, { mode: theme === 'dark' ? 'dark' : 'light', locale: language })
        const stylist = { id: 'stylist-1', user: { username: 'ana', firstName: 'Ana', lastName: 'Test' } }
        const service = { id: 'service-1', name: 'Fixture service', price: 50 }
        const manual = { id: 'manual-1', date: '2026-03-02T00:00:00Z', serviceId: service.id, stylistProfileId: stylist.id, clientId: null, amount: 30, tipAmount: 5, notes: 'Fixture', service, stylistProfile: stylist, createdAt: '2026-03-02T00:00:00Z', updatedAt: '2026-03-02T00:00:00Z' }
        const book = { id: 'book-1', year: 2026, month: 3, totalRevenue: 30, totalTips: 5, openedAt: '2026-03-01T00:00:00Z', closedAt: null, entries: [], manualEntries: [manual], lockEvents: [], manualAudits: [] }
        let attempts = 0
        let release!: () => void
        const gate = new Promise<void>(resolve => { release = resolve })
        const writes: string[] = []
        await page.route('**/api/**', async route => {
          const req = route.request(), path = new URL(req.url()).pathname
          if (req.method() !== 'GET') { writes.push(`${req.method()} ${path}`); return route.abort() }
          if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_active_skin', value: theme === 'classic' ? 'classic' : 'aurum' }, { key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
          if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
          if (path === '/api/income-books') return route.fulfill({ json: [book] })
          if (path === '/api/income-books/book-1') return route.fulfill({ json: book })
          if (path === '/api/income-books/book-1/integrity') return route.fulfill({ json: { bookId: 'book-1', isLocked: false, missingCount: 0, orphanedCount: 0, isHealthy: true, missing: [], orphaned: [] } })
          if (path === '/api/stylists/admin') return route.fulfill({ json: [stylist] })
          if (path === '/api/stylists/admin/stylist-1/services') {
            attempts++
            if (attempts === 1) await gate
            if (attempts <= 2) return route.fulfill({ status: 503, json: { message: 'unavailable' } })
            return route.fulfill({ json: [{ service }] })
          }
          if (path === '/api/users/clients') return route.fulfill({ json: { items: [] } })
          return route.fulfill({ json: {} })
        })
        try {
          await page.goto('/admin/finance?tab=income', { waitUntil: 'domcontentloaded' })
          await expect(page.locator('html')).toHaveAttribute('data-skin', theme === 'classic' ? 'classic' : 'aurum')
          await expect(page.locator('html')).toHaveAttribute('lang', language)
          const open = page.getByRole('button', { name: /otvori knjigu.*2026|open book.*2026/i })
          await tabTo(page, open)
          await page.keyboard.press('Enter')
          const edit = page.getByRole('button', { name: /uredi ručni prihod|edit manual income entry/i })
          await tabTo(page, edit)
          await page.keyboard.press('Enter')
          const dialog = page.getByRole('dialog')
          await expect(dialog).toBeVisible()
          await expect.poll(() => attempts).toBe(1)
          await expect(dialog.locator('#manual-paid')).toHaveValue('35')
          const save = dialog.getByRole('button', { name: /^sačuvaj$|^save$/i })
          const unavailable = dialog.getByText(language === 'bs' ? 'Nedostupno' : 'Unavailable', { exact: true })
          await expect(save).toBeDisabled()
          await expect(unavailable).toHaveCount(3)
          await expect(dialog.getByRole('status').filter({ hasText: /učitavanje usluga|loading services/i })).toBeVisible()
          release()
          await expect(dialog.getByRole('alert').filter({ hasText: /usluge se ne mogu učitati|could not load services/i })).toBeVisible({ timeout: 15_000 })
          await expect(save).toBeDisabled()
          await expect(unavailable).toHaveCount(3)
          const retry = dialog.getByRole('button', { name: /ponovo učitaj usluge|reload services/i })
          await tabTo(page, retry)
          await page.keyboard.press('Enter')
          await expect(dialog.locator('#manual-service')).toHaveValue('service-1')
          await expect(dialog.locator('#manual-service')).toBeFocused()
          await expect(unavailable).toHaveCount(0)
          await expect(save).toBeEnabled()
          const summary = dialog.getByText(language === 'bs' ? 'Cijena servisa' : 'Service price', { exact: true }).locator('..')
          await expect(summary).toContainText(/50[,.]00/)
          const outstanding = dialog.getByText(language === 'bs' ? 'Nenaplaćeno' : 'Outstanding', { exact: true }).locator('..')
          await expect(outstanding).toContainText(/15[,.]00/)
          expect(writes).toEqual([])
        } finally { release() }
      })
    }
  }
}
