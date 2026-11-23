import { expect, test } from '@playwright/test'

// Synthetic catalogue and writes only; verifies the extracted view against the
// actual delete/merge workflow, including financial values and blocking conflicts.
for (const theme of ['classic', 'light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    test(`S8 service impact remains accurate ${theme} ${language}`, async ({ page }) => {
      await page.addInitScript(({ mode, locale }) => {
        localStorage.setItem('token', 'fixture-admin-token')
        localStorage.setItem('APP_LOCALE', locale)
        localStorage.removeItem('nejra.theme')
        localStorage.setItem('nejra.theme.mode', mode)
      }, { mode: theme === 'dark' ? 'dark' : 'light', locale: language })
      const category = { id: 'cat', name: 'Category fixture', isActive: true, sortOrder: 0 }
      const sub = { id: 'sub', categoryId: 'cat', name: 'Subcategory fixture', isActive: true, sortOrder: 0 }
      const services = ['Original service', 'Conflict target', 'Safe target', 'Original service'].map((name, index) => ({ id: `svc-${index}`, name, subcategoryId: 'sub', durationMinutes: 30, price: 30, gender: 'FEMALE', isActive: true, sortOrder: index, heroImage: null, shortDescription: null }))
      const writes: Array<{ method: string; path: string; body: unknown }> = []
      await page.route('**/api/**', async route => {
        const req = route.request(), url = new URL(req.url()), path = url.pathname
        if (req.method() !== 'GET') {
          writes.push({ method: req.method(), path, body: req.postDataJSON() })
          if (req.method() === 'DELETE' && path === '/api/services/svc-0') return route.fulfill({ json: { ok: true } })
          return route.abort()
        }
        if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_active_skin', value: theme === 'classic' ? 'classic' : 'aurum' }, { key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
        if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
        if (path === '/api/services/admin/categories') return route.fulfill({ json: [category] })
        if (path === '/api/services/admin/subcategories') return route.fulfill({ json: [sub] })
        if (path === '/api/services/admin/services') return route.fulfill({ json: services })
        if (path === '/api/services/admin/services/svc-0/deletion-impact') {
          const target = url.searchParams.get('targetServiceId')
          return route.fulfill({ json: {
            service: { id: 'svc-0', name: 'Original service', imageRetained: true }, target: target ? { id: target, name: target === 'svc-1' ? 'Conflict target' : 'Safe target' } : null,
            reservations: { primary: 1, additionalServiceItems: 2 }, dailyLogs: { primary: 3, completed: 4, additionalServiceItems: 5, debtPaymentEntries: 6 },
            income: { automaticEntries: 7, automaticRevenue: 101.25, automaticTips: 2.5, manualEntries: 8, manualRevenue: 202.5, manualTips: 3.5 },
            debts: { count: 9, openCount: 10, amount: 303.25, openAmount: 44.5 }, images: { dailyLogImages: 13, consentRecordsRetained: 14 },
            reviews: 11, stylistLinks: 12, pendingOutboxEvents: 15, duplicateStylistLinks: 2,
            mergeConflicts: { reservationItems: target === 'svc-1' ? 3 : 0, dailyLogItems: 0, dailyLogReservations: 0, reviews: 0, processingOutboxEvents: 0 }, impactToken: `token-${target ?? 'delete'}`,
          } })
        }
        return route.fulfill({ json: {} })
      })
      await page.goto('/admin/services', { waitUntil: 'networkidle' })
      await expect(page.locator('html')).toHaveAttribute('data-skin', theme === 'classic' ? 'classic' : 'aurum')
      await page.getByRole('button', { name: /Category fixture/, expanded: false }).click()
      const deleteLabel = language === 'en' ? 'Delete service' : 'Obriši uslugu'
      const first = page.getByRole('button', { name: `${deleteLabel}: Original service (1)`, exact: true })
      const second = page.getByRole('button', { name: `${deleteLabel}: Original service (2)`, exact: true })
      await expect(first).toBeVisible()
      await expect(second).toBeVisible()
      await first.click()
      const dialog = page.getByRole('dialog')
      const summary = dialog.locator('section[aria-labelledby="service-deletion-impact-title"]')
      await expect(summary).toBeVisible()
      expect(await summary.locator('dd').allTextContents()).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '1', '13', '14', '15'])
      await expect(summary).toContainText(/101[.,]25/)
      await expect(summary).toContainText(/202[.,]50/)
      await expect(summary).toContainText(/303[.,]25/)
      const confirmation = dialog.locator('#service-delete-confirmation')
      const deleteButton = dialog.getByRole('button', { name: language === 'en' ? 'Permanently delete all linked data' : 'Trajno obriši sve povezano', exact: true })
      await expect(deleteButton).toBeDisabled()
      await confirmation.fill('Original service')
      await expect(deleteButton).toBeEnabled()
      await dialog.getByRole('button', { name: language === 'en' ? /Merge into another service/ : /spoji sa drugom uslugom/i }).click()
      await dialog.locator('#service-merge-target').selectOption('svc-1')
      await expect(summary).toContainText('Conflict target')
      const mergeButton = dialog.getByRole('button', { name: language === 'en' ? 'Merge and reassign records' : /spoji i prenesi zapise/i })
      await expect(mergeButton).toBeDisabled()
      await expect(summary.getByRole('alert')).toBeVisible()
      await dialog.locator('#service-merge-target').selectOption('svc-2')
      await expect(summary).toContainText('Safe target')
      await expect(mergeButton).toBeEnabled()
      await mergeButton.click()
      await expect(dialog).toBeHidden()
      expect(writes).toEqual([{ method: 'DELETE', path: '/api/services/svc-0', body: { action: 'MERGE', confirmationName: 'Original service', impactToken: 'token-svc-2', targetServiceId: 'svc-2' } }])
    })
  }
}
