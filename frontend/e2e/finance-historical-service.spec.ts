import { expect, test } from '@playwright/test'

for (const language of ['bs', 'en'] as const) {
  for (const locked of [false, true]) {
    test(`historical unsupported income ${language} ${locked ? 'locked' : 'open'}`, async ({ page }) => {
      await page.addInitScript(locale => {
        localStorage.setItem('token', 'fixture-admin-token')
        localStorage.setItem('APP_LOCALE', locale)
      }, language)
      const stylist = { id: 'stylist-1', user: { username: 'ana', firstName: 'Ana', lastName: 'Test' } }
      const service = { id: 'service-1', name: 'Historical fixture', price: 50 }
      const entry = { id: 'entry-1', date: '2026-03-02T00:00:00Z', serviceId: service.id, stylistProfileId: stylist.id, canEditOriginalService: false, amount: 30, tipAmount: 0, service, stylistProfile: stylist, notes: null }
      const book = { id: 'book-1', year: 2026, month: 3, totalRevenue: 30, totalTips: 0, openedAt: '2026-03-01T00:00:00Z', closedAt: locked ? '2026-04-01T00:00:00Z' : null, entries: [], manualEntries: [entry], lockEvents: [], manualAudits: [] }
      const writes: string[] = []
      await page.route('**/api/**', async route => {
        const request = route.request(), path = new URL(request.url()).pathname
        if (request.method() !== 'GET') { writes.push(`${request.method()} ${path}`); return route.abort() }
        if (path === '/api/settings/public') return route.fulfill({ json: [] })
        if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
        if (path === '/api/income-books') return route.fulfill({ json: [book] })
        if (path === '/api/income-books/book-1') return route.fulfill({ json: book })
        if (path === '/api/income-books/book-1/integrity') return route.fulfill({ json: { bookId: 'book-1', isLocked: locked, missingCount: 0, orphanedCount: 0, isHealthy: true, missing: [], orphaned: [] } })
        return route.fulfill({ json: {} })
      })
      await page.goto('/admin/finance?tab=income', { waitUntil: 'domcontentloaded' })
      await page.getByRole('button', { name: /otvori knjigu.*2026|open book.*2026/i }).click()
      const row = page.getByRole('row').filter({ hasText: 'Historical fixture' })
      await expect(row).toBeVisible()
      await expect(row.getByRole('button', { name: /uredi ručni prihod|edit manual income entry/i })).toHaveCount(0)
      const remove = row.getByRole('button', { name: /obriši ručni prihod|delete manual income entry/i })
      if (locked) {
        await expect(remove).toHaveCount(0)
      } else {
        await expect(row).toContainText(language === 'bs' ? 'Unos se ne može urediti' : 'The entry cannot be edited')
        await expect(remove).toBeVisible()
        await remove.click()
        await expect(page.getByRole('dialog')).toBeVisible()
      }
      expect(writes).toEqual([])
    })
  }
}
