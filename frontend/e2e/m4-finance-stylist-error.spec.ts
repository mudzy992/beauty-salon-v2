import { expect, test, type Locator, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { AXE_RULE_TAGS, assertableViolations } from './axe-coverage.mjs'
import { settleAnimations } from './settle'

async function tabTo(page: Page, target: Locator) {
  await expect(target).toBeVisible()
  for (let i = 0; i < 150 && !(await target.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
  await expect(target).toBeFocused()
}

// Synthetic GET failures and responses only; all writes are blocked.
for (const theme of ['light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const viewport of ['desktop', 'mobile'] as const) {
      for (const focusMode of ['retained', 'moved', 'closed'] as const) {
        test(`M4 stylist lookup recovery ${theme} ${language} ${viewport} focus ${focusMode}`, async ({ page }) => {
          const moveFocus = focusMode === 'moved'
          test.setTimeout(90_000)
          await page.setViewportSize(viewport === 'desktop' ? { width: 1280, height: 900 } : { width: 390, height: 844 })
          await page.emulateMedia({ reducedMotion: 'reduce' })
          await page.addInitScript(({ mode, locale }) => {
            localStorage.setItem('token', 'fixture-admin-token')
            localStorage.removeItem('nejra.theme')
            localStorage.setItem('nejra.theme.mode', mode)
            localStorage.setItem('APP_LOCALE', locale)
          }, { mode: theme === 'dark' ? 'dark' : 'light', locale: language })
          const book = { id: 'book-1', year: 2026, month: 3, totalRevenue: 0, totalTips: 0, openedAt: '2026-03-01T00:00:00Z', closedAt: null, entries: [], manualEntries: [], lockEvents: [], manualAudits: [] }
          let attempts = 0
          let successResponseCompleted = false
          let release!: () => void
          const gate = new Promise<void>(resolve => { release = resolve })
          const writes: string[] = []
          await page.route('**/api/**', async route => {
            const req = route.request(), path = new URL(req.url()).pathname
            if (req.method() !== 'GET') { writes.push(`${req.method()} ${path}`); return route.abort() }
            if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
            if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
            if (path === '/api/income-books') return route.fulfill({ json: [book] })
            if (path === '/api/income-books/book-1') return route.fulfill({ json: book })
            if (path === '/api/income-books/book-1/integrity') return route.fulfill({ json: { bookId: 'book-1', isLocked: false, missingCount: 0, orphanedCount: 0, isHealthy: true, missing: [], orphaned: [] } })
            if (path === '/api/stylists/admin') {
              attempts++
              if (attempts <= 4) return route.fulfill({ status: 503, json: { message: 'unavailable' } })
              await gate
              await route.fulfill({ json: [{ id: 'stylist-1', user: { username: 'ana', firstName: 'Ana', lastName: 'Test' } }] })
              successResponseCompleted = true
              return
            }
            if (path === '/api/stylists/admin/stylist-1/services') return route.fulfill({ json: [{ service: { id: 'service-1', name: 'Fixture service', price: 50 } }] })
            if (path === '/api/users/clients') return route.fulfill({ json: { items: [] } })
            return route.fulfill({ json: {} })
          })
          try {
            await page.goto('/admin/finance?tab=income', { waitUntil: 'domcontentloaded' })
            await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
            await expect(page.locator('html')).toHaveAttribute('lang', language)
            const bookButton = page.getByRole('button', { name: /otvori knjigu.*2026|open book.*2026/i })
            await tabTo(page, bookButton)
            await page.keyboard.press('Enter')
            const trigger = page.getByRole('button', { name: /^ručni prihod$|^manual income$/i })
            await tabTo(page, trigger)
            await page.keyboard.press('Enter')
            const dialog = page.getByRole('dialog')
            await expect(dialog).toBeVisible()
            const stylist = dialog.locator('#manual-stylist')
            const error = dialog.getByText(language === 'bs' ? 'Stilisti se ne mogu učitati.' : 'Could not load stylists.', { exact: true })
            const retry = dialog.getByRole('button', { name: language === 'bs' ? 'Ponovo učitaj stiliste' : 'Reload stylists' })
            await expect(error).toBeVisible({ timeout: 15_000 })
            await expect(stylist).toBeDisabled()
            await expect(stylist).toHaveAccessibleDescription(await error.textContent() ?? '')
            await expect.poll(() => attempts).toBe(2)
            if (viewport === 'desktop' && focusMode === 'retained') {
              await expect.poll(async () => (await settleAnimations(page))?.stillRunning ?? -1).toBe(0)
              const results = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(AXE_RULE_TAGS).analyze()
              const findings = { violations: results.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(node => ({ target: node.target, html: node.html, summary: node.failureSummary })) })), incomplete: results.incomplete.map(({ id, nodes }) => ({ id, nodes: nodes.map(node => ({ target: node.target, html: node.html, summary: node.failureSummary })) })) }
              console.log(`M7_INCOME_LOOKUP_ERROR_${theme.toUpperCase()}_${language.toUpperCase()} ${JSON.stringify(findings)}`)
              await test.info().attach('income-lookup-error-axe', { body: JSON.stringify(findings, null, 2), contentType: 'application/json' })
              expect(assertableViolations(results.violations)).toEqual([])
              expect(results.violations.filter(item => item.tags.includes('wcag2aaa'))).toEqual([])
            }
            await tabTo(page, retry)
            await page.keyboard.press('Enter')
            const date = dialog.locator('#manual-date')
            if (moveFocus) await tabTo(page, date)
            await expect.poll(() => attempts, { timeout: 15_000 }).toBe(4)
            await expect(error).toBeVisible({ timeout: 15_000 })
            if (moveFocus) {
              await expect(date).toBeFocused()
              await tabTo(page, retry)
            } else {
              await expect(retry).toBeFocused()
            }
            await expect(stylist).toBeDisabled()
            await page.keyboard.press('Space')
            await expect.poll(() => attempts).toBe(5)
            await expect(stylist).toBeDisabled()
            await expect(dialog.getByRole('status').filter({ hasText: /učitavanje stilista|loading stylists/i })).toBeVisible()
            await expect(retry).toBeFocused()
            await expect(retry).toHaveAttribute('aria-disabled', 'true')
            await page.keyboard.press('Enter')
            expect(attempts).toBe(5)
            if (focusMode === 'closed') {
              const cancel = dialog.getByRole('button', { name: /^odustani$|^cancel$/i })
              await tabTo(page, cancel)
              await page.keyboard.press('Enter')
              await expect(dialog).toBeHidden()
              await expect(trigger).toBeFocused()
              release()
              await expect.poll(() => successResponseCompleted).toBe(true)
              await expect(trigger).toBeFocused()
              await page.keyboard.press('Enter')
              await expect(dialog).toBeVisible()
              await expect(stylist).toBeEnabled()
            } else if (moveFocus) {
              await tabTo(page, date)
              release()
              await expect(stylist).toBeEnabled()
              await expect(date).toBeFocused()
            } else {
              release()
              await expect(stylist).toBeEnabled()
              await expect(stylist).toBeFocused()
            }
            await expect(retry).toHaveCount(0)
            await expect(stylist).not.toHaveAttribute('aria-describedby')
            await expect(stylist.locator('option[value="stylist-1"]')).toHaveCount(1)
            if (focusMode !== 'retained') await tabTo(page, stylist)
            await page.keyboard.press('ArrowDown')
            await page.keyboard.press('Enter')
            await expect(stylist).toHaveValue('stylist-1')
            await expect(dialog.locator('#manual-service option[value="service-1"]')).toHaveCount(1)
            expect(writes).toEqual([])
          } finally { release() }
        })
      }
    }
  }
}
