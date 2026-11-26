import { expect, test, type Locator, type Page } from '@playwright/test'

async function tabTo(page: Page, target: Locator, limit = 150) {
  await expect(target).toBeVisible()
  for (let i = 0; i < limit && !(await target.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
  await expect(target).toBeFocused()
}

for (const theme of ['light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const viewport of ['desktop', 'mobile'] as const) {
      for (const outcome of ['success', 'failure', 'moved'] as const) {
      test(`M1 expense line removal ${theme} ${language} ${viewport} ${outcome}`, async ({ page }) => {
        await page.setViewportSize(viewport === 'desktop' ? { width: 1280, height: 900 } : { width: 390, height: 844 })
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.addInitScript(({ mode, locale }) => {
          localStorage.setItem('token', 'fixture-admin-token')
          localStorage.removeItem('nejra.theme')
          localStorage.setItem('nejra.theme.mode', mode)
          localStorage.setItem('APP_LOCALE', locale)
        }, { mode: theme === 'dark' ? 'dark' : 'light', locale: language })
        const category = { id: 'cat-1', name: 'Fixture category', isActive: true, isFixed: false, templateId: 'template-1', template: { id: 'template-1', name: 'Fixture', requiresAttachmentPerItem: true, fields: [
          { id: 'label', fieldName: 'Item name', fieldType: 'TEXT', lineRole: 'LABEL', isRequired: true, sortOrder: 0, defaultValue: '' },
          { id: 'amount', fieldName: 'Amount', fieldType: 'CURRENCY', lineRole: 'AMOUNT', isRequired: true, sortOrder: 1, defaultValue: '' },
        ] } }
        const book = { id: 'expense-book-1', year: 2026, month: 3, isClosed: false, openedAt: '2026-03-01T00:00:00Z', closedAt: null, expenses: [], totalExpenses: 0, lockEvents: [] }
        const writes: { path: string; body: unknown }[] = []
        let uploads = 0
        let releaseUpload!: () => void
        const uploadGate = new Promise<void>(resolve => { releaseUpload = resolve })
        await page.route('**/api/**', async route => {
          const req = route.request(), path = new URL(req.url()).pathname
          if (req.method() !== 'GET') {
            if (req.method() === 'POST' && path === '/api/uploads') {
              uploads++
              if (uploads === 1) {
                await uploadGate
                if (outcome === 'failure') return route.fulfill({ status: 503, json: {} })
              }
              return route.fulfill({ json: { id: `upload-${uploads}` } })
            }
            if (req.method() === 'POST' && path === '/api/expenses') {
              writes.push({ path, body: req.postDataJSON() })
              return route.fulfill({ json: { id: 'synthetic-expense' } })
            }
            return route.abort()
          }
          if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
          if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
          if (path === '/api/expense-books') return route.fulfill({ json: [book] })
          if (path === '/api/expense-books/expense-book-1') return route.fulfill({ json: book })
          if (path === '/api/expense-categories') return route.fulfill({ json: [category] })
          return route.fulfill({ json: {} })
        })
        await page.goto('/admin/finance?tab=expense', { waitUntil: 'networkidle' })
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
        const date = dialog.locator('#expense-date')
        // The native date widget is filled as a fixture; it is not a test of OS date entry.
        await date.fill('2026-03-04')
        const firstName = dialog.locator('#item-0-label')
        await tabTo(page, firstName, 50)
        await page.keyboard.type('First')
        const firstAmount = dialog.locator('#item-0-amount')
        await tabTo(page, firstAmount, 30)
        await page.keyboard.type('10')
        const firstUpload = dialog.locator('input[type=file]').first()
        await tabTo(page, firstUpload, 30)
        await firstUpload.setInputFiles({ name: 'first.txt', mimeType: 'text/plain', buffer: Buffer.from('first synthetic file') })
        const add = dialog.getByRole('button', { name: /dodaj stavku|add item/i })
        await expect.poll(() => uploads).toBe(1)
        await expect(add).toBeDisabled()
        await expect(select).toBeDisabled()
        await expect(dialog.getByRole('button', { name: /ukloni stavku 1|remove item 1/i })).toBeDisabled()
        const firstRow = dialog.locator('#item-0-label').locator('xpath=../../..')
        const clear = firstRow.getByRole('button', { name: /ukloni prilog stavke 1|remove attachment for item 1/i })
        const title = dialog.locator('#expense-title')
        if (outcome === 'moved') await tabTo(page, title, 40)
        releaseUpload()
        if (outcome === 'failure') {
          await expect(firstUpload).toBeEnabled()
          await expect(firstUpload).toBeFocused()
          await expect(dialog.getByText(/first.*\.txt/i)).toHaveCount(0)
        } else {
          await expect(dialog.getByText(/first.*\.txt/i)).toBeVisible()
          await expect(add).toBeEnabled()
          if (outcome === 'moved') {
            await expect(title).toBeFocused()
            await tabTo(page, clear, 50)
          } else await expect(clear).toBeFocused()
          await page.keyboard.press('Enter')
          await expect(firstUpload).toBeFocused()
          await expect(dialog.getByText(/first.*\.txt/i)).toHaveCount(0)
        }
        await firstUpload.setInputFiles({ name: 'first.txt', mimeType: 'text/plain', buffer: Buffer.from('first synthetic file') })
        await expect(dialog.getByText(/first.*\.txt/i)).toBeVisible()
        await expect(firstRow.getByRole('button', { name: /ukloni prilog stavke 1|remove attachment for item 1/i })).toBeFocused()
        await tabTo(page, add, 50)
        await page.keyboard.press('Enter')
        const secondName = dialog.locator('#item-1-label')
        await tabTo(page, secondName, 50)
        await page.keyboard.type('Second')
        const secondAmount = dialog.locator('#item-1-amount')
        await tabTo(page, secondAmount, 30)
        await page.keyboard.type('20')
        const secondUpload = dialog.getByRole('button', { name: /ukloni stavku 2|remove item 2/i }).locator('xpath=../..').locator('input[type=file]')
        await secondUpload.setInputFiles({ name: 'second.txt', mimeType: 'text/plain', buffer: Buffer.from('second synthetic file') })
        await expect(dialog.getByText(/second.*\.txt/i)).toBeVisible()
        await expect(dialog.getByRole('button', { name: /ukloni prilog stavke 2|remove attachment for item 2/i })).toBeVisible()
        const removeFirst = dialog.getByRole('button', { name: /ukloni stavku 1|remove item 1/i })
        await tabTo(page, removeFirst, 50)
        await page.keyboard.press('Enter')
        await expect(dialog.locator('#item-0-label')).toHaveValue('Second')
        await expect(dialog.getByText(/second.*\.txt/i)).toBeVisible()
        await expect(dialog.getByText(/first.*\.txt/i)).toHaveCount(0)
        await expect(add).toBeFocused()
        const save = dialog.getByRole('button', { name: /^sačuvaj$|^save$/i })
        await expect(save).toBeEnabled()
        await tabTo(page, save, 50)
        await page.keyboard.press('Enter')
        await expect(dialog).toBeHidden()
        await expect(trigger).toBeFocused()
        expect(uploads).toBe(3)
        expect(writes).toHaveLength(1)
        expect(writes[0]).toMatchObject({ path: '/api/expenses', body: { bookId: 'expense-book-1', categoryId: 'cat-1', totalAmount: 20, attachmentUploadIds: ['upload-3'] } })
        const body = writes[0].body as { notes: string }
        expect(JSON.parse(body.notes).lineItems).toEqual([{ values: { label: 'Second', amount: '20' } }])

        // Removing the only line also leaves focus on the Add item control.
        await page.keyboard.press('Enter')
        await expect(dialog).toBeVisible()
        await expect(select).toHaveValue('')
        await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
        await tabTo(page, select, 40)
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press('Enter')
        await expect(select).toHaveValue('cat-1')
        await tabTo(page, removeFirst, 40)
        await page.keyboard.press('Enter')
        await expect(dialog.locator('#item-0-label')).toHaveCount(0)
        await expect(add).toBeFocused()
        await page.keyboard.press('Escape')
        await expect(dialog).toBeHidden()
        await expect(trigger).toBeFocused()
        expect(writes).toHaveLength(1)
      })
      }
    }
  }
}
