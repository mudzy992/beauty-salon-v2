import { expect, test } from '@playwright/test'

// Delete requests are intercepted. Success removes only a synthetic fixture row.
for (const theme of ['classic', 'light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const viewport of ['desktop', 'mobile'] as const) {
      for (const kind of ['income', 'expense'] as const) {
        for (const scenario of ['escape', 'failure', 'success'] as const) {
          test(`M1 finance delete focus ${theme} ${language} ${viewport} ${kind} ${scenario}`, async ({ page }) => {
            await page.setViewportSize(viewport === 'desktop' ? { width: 1280, height: 900 } : { width: 390, height: 844 })
            await page.emulateMedia({ reducedMotion: 'reduce' })
            await page.addInitScript(({ mode, locale }) => {
              localStorage.setItem('token', 'fixture-admin-token')
              localStorage.removeItem('nejra.theme')
              localStorage.setItem('nejra.theme.mode', mode)
              localStorage.setItem('APP_LOCALE', locale)
            }, { mode: theme === 'dark' ? 'dark' : 'light', locale: language })
            const stylist = { id: 'stylist-income', user: { username: 'ana', firstName: 'Ana', lastName: 'Test' } }
            const service = { id: 'service-income', name: 'Test usluga', price: 50 }
            const manual = { id: 'income-manual', date: '2026-03-02T00:00:00Z', serviceId: service.id, stylistProfileId: stylist.id, clientId: null, amount: 50, tipAmount: 5, notes: 'Fixture', createdAt: '2026-03-02T00:00:00Z', updatedAt: '2026-03-02T00:00:00Z', service, stylistProfile: stylist }
            const category = { id: 'category-1', name: 'Test kategorija', isActive: true, isFixed: true, templateId: 'template-1', template: { id: 'template-1', name: 'Test', fields: [], requiresAttachmentPerItem: false } }
            const expense = { id: 'expense-1', title: 'Test rashod', expenseDate: '2026-03-01T00:00:00Z', dateEstimated: true, totalAmount: 30, notes: 'Fixture', createdAt: '2026-03-02T00:00:00Z', category, fieldValues: [], attachments: [] }
            let deleted = false
            const writes: string[] = []
            const incomeBook = () => ({ id: 'income-book-1', year: 2026, month: 3, totalRevenue: deleted ? 0 : 50, totalTips: deleted ? 0 : 5, openedAt: '2026-03-01T00:00:00Z', closedAt: null, entries: [], manualEntries: deleted ? [] : [manual], lockEvents: [], manualAudits: [] })
            const expenseBook = () => ({ id: 'expense-book-1', year: 2026, month: 3, isClosed: false, openedAt: '2026-03-01T00:00:00Z', closedAt: null, expenses: deleted ? [] : [expense], totalExpenses: deleted ? 0 : 30, lockEvents: [] })
            const deletePath = kind === 'income' ? '/api/income-books/income-book-1/manual-entries/income-manual' : '/api/expenses/expense-1'
            await page.route('**/api/**', route => {
              const req = route.request(), path = new URL(req.url()).pathname
              if (req.method() !== 'GET') {
                writes.push(`${req.method()} ${path}`)
                if (req.method() === 'DELETE' && path === deletePath && scenario !== 'escape') {
                  if (scenario === 'failure') return route.fulfill({ status: 503, json: {} })
                  deleted = true
                  return route.fulfill({ status: 204, body: '' })
                }
                return route.abort()
              }
              if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_active_skin', value: theme === 'classic' ? 'classic' : 'aurum' }, { key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
              if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
              if (path === '/api/income-books') return route.fulfill({ json: [incomeBook()] })
              if (path === '/api/income-books/income-book-1') return route.fulfill({ json: incomeBook() })
              if (path === '/api/income-books/income-book-1/integrity') return route.fulfill({ json: { bookId: 'income-book-1', isLocked: false, missingCount: 0, orphanedCount: 0, isHealthy: true, missing: [], orphaned: [] } })
              if (path === '/api/expense-books') return route.fulfill({ json: [expenseBook()] })
              if (path === '/api/expense-books/expense-book-1') return route.fulfill({ json: expenseBook() })
              if (path === '/api/expense-categories') return route.fulfill({ json: [category] })
              if (path === '/api/stylists/admin') return route.fulfill({ json: [stylist] })
              return route.fulfill({ json: {} })
            })
            await page.goto(`/admin/finance?tab=${kind}`, { waitUntil: 'networkidle' })
            await expect(page.locator('html')).toHaveAttribute('data-skin', theme === 'classic' ? 'classic' : 'aurum')
            await expect(page.locator('html')).toHaveAttribute('lang', language)
            const open = page.getByRole('button', { name: /otvori knjigu.*2026|open book.*2026/i })
            await expect(open).toBeVisible()
            for (let i = 0; i < 160 && !(await open.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
            await expect(open).toBeFocused()
            await page.keyboard.press('Enter')
            const trigger = page.getByRole('button', { name: kind === 'income' ? /obriši ručni prihod|delete manual income entry/i : /obriši rashod Test rashod|delete expense Test rashod/i })
            await expect(trigger).toBeVisible()
            for (let i = 0; i < 160 && !(await trigger.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
            await expect(trigger).toBeFocused()
            await page.keyboard.press('Enter')
            const dialog = page.getByRole('dialog')
            await expect(dialog).toBeVisible()
            await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
            if (scenario === 'escape') {
              await page.keyboard.press('Escape')
            } else {
              const confirm = dialog.getByRole('button', { name: /^obriši$|^delete$/i })
              for (let i = 0; i < 20 && !(await confirm.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
              await expect(confirm).toBeFocused()
              await page.keyboard.press('Enter')
            }
            await expect(dialog).toBeHidden()
            if (scenario === 'success') {
              await expect(trigger).toHaveCount(0)
              await expect(page.locator('main#main')).toBeFocused()
            } else {
              await expect(trigger).toBeFocused()
            }
            expect(writes).toEqual(scenario === 'escape' ? [] : [`DELETE ${deletePath}`])
          })
        }
      }
    }
  }
}
