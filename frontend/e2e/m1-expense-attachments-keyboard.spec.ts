import { expect, test, type Locator, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { AXE_RULE_TAGS, assertableViolations } from './axe-coverage.mjs'

// Only synthetic fixtures are used; preserve bounded diagnostics if CI logs are unavailable.
test.afterEach(async ({}, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return
  const detail = testInfo.errors.map(error => error.message ?? String(error)).join('\n').slice(0, 2200)
  const escape = (text: string) => text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
  console.log(`::error title=${escape(testInfo.title)}::${escape(detail)}`)
})

async function tabTo(page: Page, target: Locator, limit = 150) {
  await expect(target).toBeVisible()
  for (let i = 0; i < limit && !(await target.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
  await expect(target).toBeFocused()
}

// Synthetic files and intercepted requests only; no real upload or expense is created.
for (const theme of ['classic', 'light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const viewport of ['desktop', 'mobile'] as const) {
      for (const kind of ['fixed', 'bulk'] as const) {
        for (const outcome of ['success', 'failure', 'moved', 'closed'] as const) {
          test(`M1 expense attachments ${theme} ${language} ${viewport} ${kind} ${outcome}`, async ({ page }) => {
            await page.setViewportSize(viewport === 'desktop' ? { width: 1280, height: 900 } : { width: 390, height: 844 })
            await page.emulateMedia({ reducedMotion: 'reduce' })
            await page.addInitScript(({ mode, locale }) => {
              localStorage.setItem('token', 'fixture-admin-token')
              localStorage.removeItem('nejra.theme')
              localStorage.setItem('nejra.theme.mode', mode)
              localStorage.setItem('APP_LOCALE', locale)
            }, { mode: theme === 'dark' ? 'dark' : 'light', locale: language })
            const fields = kind === 'fixed'
              ? [{ id: 'rent', fieldName: 'Fixture rent', fieldType: 'CURRENCY', isRequired: true, sortOrder: 0, defaultValue: '' }]
              : [{ id: 'label', fieldName: 'Item name', fieldType: 'TEXT', lineRole: 'LABEL', isRequired: true, sortOrder: 0, defaultValue: '' }, { id: 'amount', fieldName: 'Amount', fieldType: 'CURRENCY', lineRole: 'AMOUNT', isRequired: true, sortOrder: 1, defaultValue: '' }]
            const category = { id: 'cat-1', name: 'Fixture category', isActive: true, isFixed: kind === 'fixed', templateId: 'template-1', template: { id: 'template-1', name: 'Fixture', requiresAttachmentPerItem: kind === 'fixed', fields } }
            const book = { id: 'expense-book-1', year: 2026, month: 3, isClosed: false, openedAt: '2026-03-01T00:00:00Z', closedAt: null, expenses: [], totalExpenses: 0, lockEvents: [] }
            const writes: unknown[] = []
            let uploads = 0
            let releaseUpload!: () => void
            const uploadGate = new Promise<void>(resolve => { releaseUpload = resolve })
            await page.route('**/api/**', async route => {
              const req = route.request(), path = new URL(req.url()).pathname
              if (req.method() !== 'GET') {
                if (req.method() === 'POST' && path === '/api/uploads') {
                  const current = ++uploads
                  if (current === 1) { await uploadGate; if (outcome === 'failure') return route.fulfill({ status: 503, json: {} }) }
                  return route.fulfill({ json: { id: `upload-${current}` } })
                }
                if (req.method() === 'POST' && path === '/api/expenses') { writes.push(req.postDataJSON()); return route.fulfill({ json: { id: 'fixture-expense' } }) }
                return route.abort()
              }
              if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_active_skin', value: theme === 'classic' ? 'classic' : 'aurum' }, { key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
              if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
              if (path === '/api/expense-books') return route.fulfill({ json: [book] })
              if (path === '/api/expense-books/expense-book-1') return route.fulfill({ json: book })
              if (path === '/api/expense-categories') return route.fulfill({ json: [category] })
              return route.fulfill({ json: {} })
            })
            await page.goto('/admin/finance?tab=expense', { waitUntil: 'networkidle' })
            await expect(page.locator('html')).toHaveAttribute('data-skin', theme === 'classic' ? 'classic' : 'aurum')
            await expect(page.locator('html')).toHaveAttribute('lang', language)
            const bookButton = page.getByRole('button', { name: /otvori knjigu.*2026|open book.*2026/i })
            await tabTo(page, bookButton)
            await page.keyboard.press('Enter')
            const trigger = page.getByRole('button', { name: /^novi rashod$|^new expense$/i })
            await tabTo(page, trigger)
            await page.keyboard.press('Enter')
            const dialog = page.getByRole('dialog')
            await expect(dialog).toBeVisible()
            const select = dialog.locator('#expense-cat')
            await tabTo(page, select, 40)
            await page.keyboard.press('ArrowDown')
            await page.keyboard.press('Enter')
            await expect(select).toHaveValue('cat-1')
            // Fixture value, not a native OS date-widget keyboard test.
            await dialog.locator('#expense-date').fill('2026-03-04')
            if (kind === 'fixed') {
              const amount = dialog.getByRole('spinbutton', { name: /Fixture rent/i })
              await tabTo(page, amount, 40)
              await page.keyboard.type('25')
            } else {
              const name = dialog.locator('#item-0-label')
              await tabTo(page, name, 40)
              await page.keyboard.type('Example')
              const amount = dialog.locator('#item-0-amount')
              await tabTo(page, amount, 40)
              await page.keyboard.type('25')
            }
            const file = kind === 'fixed' ? dialog.locator('input[type=file]') : dialog.locator('#expense-files')
            await tabTo(page, file, 40)
            await file.setInputFiles({ name: 'receipt.txt', mimeType: 'text/plain', buffer: Buffer.from('synthetic receipt') })
            await expect.poll(() => uploads).toBe(1)
            await expect(select).toBeDisabled()
            const title = dialog.locator('#expense-title')
            if (outcome === 'closed') {
              const response = page.waitForResponse(res => new URL(res.url()).pathname === '/api/uploads')
              await page.keyboard.press('Escape')
              await expect(dialog).toBeHidden()
              await expect(trigger).toBeFocused()
              releaseUpload()
              await response
              await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
              await expect(trigger).toBeFocused()
              await page.keyboard.press('Enter')
              await expect(dialog).toBeVisible()
              await expect(select).toBeEnabled()
              await expect(select).toHaveValue('')
              await tabTo(page, select, 40)
              await page.keyboard.press('ArrowDown')
              await page.keyboard.press('Enter')
              await expect(select).toHaveValue('cat-1')
              const oldBadge = dialog.getByText(kind === 'fixed' ? 'fixture-rent.txt' : 'receipt.txt', { exact: true })
              await expect(oldBadge).toHaveCount(0)
              await tabTo(page, title, 40)
              await page.keyboard.press('Escape')
              await expect(dialog).toBeHidden()
              await expect(trigger).toBeFocused()
              expect(writes).toEqual([])
              return
            }
            if (outcome === 'moved') await tabTo(page, title, 40)
            releaseUpload()
            const badge = dialog.getByText(kind === 'fixed' ? 'fixture-rent.txt' : 'receipt.txt', { exact: true })
            const remove = kind === 'fixed' ? dialog.getByRole('button', { name: /ukloni prilog za Fixture rent|remove attachment for Fixture rent/i }) : dialog.getByRole('button', { name: /receipt\.txt/i })
            if (outcome === 'failure') {
              await expect(file).toBeEnabled()
              await expect(file).toBeFocused()
              await expect(badge).toHaveCount(0)
            } else {
              await expect(badge).toBeVisible()
              if (outcome === 'success' && language === 'en' && viewport === 'desktop') {
                const axe = await new AxeBuilder({ page }).include('[role=dialog]').withTags(AXE_RULE_TAGS).analyze()
                expect(assertableViolations(axe.violations)).toEqual([])
              }
              if (outcome === 'moved') await expect(title).toBeFocused()
              else if (kind === 'fixed') await expect(remove).toBeFocused()
              else await expect(file).toBeFocused()
              await tabTo(page, remove, 40)
              await page.keyboard.press('Enter')
              await expect(badge).toHaveCount(0)
              await expect(file).toBeFocused()
            }
            await file.setInputFiles({ name: 'receipt.txt', mimeType: 'text/plain', buffer: Buffer.from('synthetic receipt') })
            await expect(badge).toBeVisible()
            const save = dialog.getByRole('button', { name: /^sačuvaj$|^save$/i })
            await expect(save).toBeEnabled()
            await tabTo(page, save, 40)
            await page.keyboard.press('Enter')
            await expect(dialog).toBeHidden()
            await expect(trigger).toBeFocused()
            expect(uploads).toBe(2)
            expect(writes).toHaveLength(1)
            expect(writes[0]).toMatchObject({ bookId: 'expense-book-1', categoryId: 'cat-1', totalAmount: 25, attachmentUploadIds: ['upload-2'] })
          })
        }
      }
    }
  }
}
