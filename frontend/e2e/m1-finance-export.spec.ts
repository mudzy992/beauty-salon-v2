import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

// Synthetic finance data only. All backend writes are blocked; print is intercepted.
for (const theme of ['classic', 'light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const kind of ['income', 'expense'] as const) {
      for (const key of ['Enter', 'Space'] as const) {
        test(`M1 keyboard finance export ${theme} ${language} ${kind} ${key}`, async ({ page }) => {
          await page.setViewportSize({ width: 1280, height: 900 })
          await page.emulateMedia({ reducedMotion: 'reduce' })
          await page.addInitScript(({ mode, locale }) => {
            localStorage.setItem('token', 'fixture-admin-token')
            localStorage.removeItem('nejra.theme')
            localStorage.setItem('nejra.theme.mode', mode)
            localStorage.setItem('APP_LOCALE', locale)
            const capture = { html: '', printed: 0 }
            ;(window as Window & { m1PrintCapture?: typeof capture }).m1PrintCapture = capture
            window.open = (() => ({
              opener: null,
              document: { write: (html: string) => { capture.html += html }, close: () => {} },
              focus: () => {}, print: () => { capture.printed++ },
            })) as unknown as typeof window.open
          }, { mode: theme === 'dark' ? 'dark' : 'light', locale: language })
          const stylist = { id: 'stylist-income', user: { username: 'ana', firstName: 'Ana', lastName: 'Test' } }
          const service = { id: 'service-income', name: 'Test usluga', price: 50 }
          const manual = { id: 'income-manual', date: '2026-03-02T00:00:00Z', serviceId: service.id, stylistProfileId: stylist.id, clientId: null, amount: 50, tipAmount: 5, notes: 'Fixture', createdAt: '2026-03-02T00:00:00Z', updatedAt: '2026-03-02T00:00:00Z', service, stylistProfile: stylist }
          const incomeBook = { id: 'income-book-1', year: 2026, month: 3, totalRevenue: 50, totalTips: 5, openedAt: '2026-03-01T00:00:00Z', closedAt: null, entries: [], manualEntries: [manual], lockEvents: [], manualAudits: [] }
          const category = { id: 'category-1', name: 'Test kategorija', isActive: true, isFixed: true, templateId: 'template-1', template: { id: 'template-1', name: 'Test', fields: [], requiresAttachmentPerItem: false } }
          const expense = { id: 'expense-1', title: 'Test rashod', expenseDate: '2026-03-01T00:00:00Z', dateEstimated: true, totalAmount: 30, notes: 'Fixture', createdAt: '2026-03-02T00:00:00Z', category, fieldValues: [], attachments: [] }
          const expenseBook = { id: 'expense-book-1', year: 2026, month: 3, isClosed: false, openedAt: '2026-03-01T00:00:00Z', closedAt: null, expenses: [expense], totalExpenses: 30, lockEvents: [] }
          const writes: string[] = []
          await page.route('**/api/**', route => {
            const req = route.request(), path = new URL(req.url()).pathname
            if (req.method() !== 'GET') { writes.push(`${req.method()} ${path}`); return route.abort() }
            if (path === '/api/settings/public') return route.fulfill({ json: [
              { key: 'theme_active_skin', value: theme === 'classic' ? 'classic' : 'aurum' },
              { key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' },
            ] })
            if (path === '/api/users/profile') return route.fulfill({ json: {
              id: 'fixture-admin', username: 'test', firstName: 'Test', lastName: 'Admin', email: 'admin@example.test',
              gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'],
            } })
            if (path === '/api/income-books') return route.fulfill({ json: [incomeBook] })
            if (path === '/api/income-books/income-book-1') return route.fulfill({ json: incomeBook })
            if (path === '/api/income-books/income-book-1/integrity') return route.fulfill({ json: { bookId: incomeBook.id, isLocked: false, missingCount: 0, orphanedCount: 0, isHealthy: true, missing: [], orphaned: [] } })
            if (path === '/api/expense-books') return route.fulfill({ json: [expenseBook] })
            if (path === '/api/expense-books/expense-book-1') return route.fulfill({ json: expenseBook })
            if (path === '/api/expense-categories') return route.fulfill({ json: [category] })
            if (path === '/api/stylists/admin') return route.fulfill({ json: [stylist] })
            if (path === '/api/stylists/admin/stylist-income/services') return route.fulfill({ json: [{ service }] })
            return route.fallback()
          })
          await page.goto(`/admin/finance?tab=${kind}`, { waitUntil: 'networkidle' })
          expect(new URL(page.url()).pathname).toBe('/admin/finance')
          expect(new URL(page.url()).searchParams.get('tab')).toBe(kind)
          await expect(page.locator('html')).toHaveAttribute('data-skin', theme === 'classic' ? 'classic' : 'aurum')
          await expect(page.locator('html')).toHaveAttribute('lang', language)
          const open = page.getByRole('button', { name: /otvori knjigu.*2026|open book.*2026/i })
          await expect(open).toBeVisible()
          for (let i = 0; i < 150 && !(await open.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
          await expect(open).toBeFocused()
          await page.keyboard.press('Enter')
          await expect(page.getByRole('table', { name: kind === 'income' ? /stavke knjige prihoda|income book entries/i : /stavke knjige rashoda|expense book entries/i })).toContainText(kind === 'income' ? 'Test usluga' : 'Test rashod')
          const csv = page.getByRole('button', { name: /preuzmi csv|download csv/i })
          const print = page.getByRole('button', { name: /štampaj ili sačuvaj kao pdf|print or save as pdf/i })
          for (let i = 0; i < 150 && !(await csv.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
          await expect(csv).toBeFocused()
          expect(await csv.evaluate(el => el.matches(':focus-visible'))).toBe(true)
          const [download] = await Promise.all([page.waitForEvent('download'), page.keyboard.press(key)])
          expect(download.suggestedFilename()).toBe(`${kind === 'income' ? 'KIF' : 'KUF'}-2026-03.csv`)
          const file = await download.path()
          expect(file).toBeTruthy()
          const content = await readFile(file!, 'utf8')
          expect(content).toContain(kind === 'income' ? 'Test usluga' : 'Test rashod')
          await page.keyboard.press('Tab')
          await expect(print).toBeFocused()
          await page.keyboard.press(key)
          const capture = await page.evaluate(() => (window as unknown as Window & { m1PrintCapture: { html: string; printed: number } }).m1PrintCapture)
          expect(capture.printed).toBe(1)
          expect(capture.html).toContain(kind === 'income' ? 'Test usluga' : 'Test rashod')
          expect(writes).toEqual([])
        })
      }
    }
  }
}
