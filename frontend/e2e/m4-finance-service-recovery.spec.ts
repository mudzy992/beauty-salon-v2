import { expect, test, type Locator, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { AXE_RULE_TAGS, assertableViolations } from './axe-coverage.mjs'
import { settleAnimations } from './settle'

async function tabTo(page: Page, target: Locator) {
  await expect(target).toBeVisible()
  for (let i = 0; i < 150 && !(await target.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
  await expect(target).toBeFocused()
}

// Synthetic lookups and failures; all writes are blocked.
for (const theme of ['light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const viewport of ['desktop', 'mobile'] as const) {
      for (const mode of ['retained', 'moved', 'closed', 'switch'] as const) {
        test(`M4 income service recovery ${theme} ${language} ${viewport} ${mode}`, async ({ page }) => {
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
          let attempts = 0, completed = false
          let releaseInitial!: () => void, releaseRetry!: () => void
          const initialGate = new Promise<void>(resolve => { releaseInitial = resolve })
          const retryGate = new Promise<void>(resolve => { releaseRetry = resolve })
          const writes: string[] = []
          await page.route('**/api/**', async route => {
            const req = route.request(), path = new URL(req.url()).pathname
            if (req.method() !== 'GET') { writes.push(`${req.method()} ${path}`); return route.abort() }
            if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
            if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
            if (path === '/api/income-books') return route.fulfill({ json: [book] })
            if (path === '/api/income-books/book-1') return route.fulfill({ json: book })
            if (path === '/api/income-books/book-1/integrity') return route.fulfill({ json: { bookId: 'book-1', isLocked: false, missingCount: 0, orphanedCount: 0, isHealthy: true, missing: [], orphaned: [] } })
            if (path === '/api/stylists/admin') return route.fulfill({ json: [{ id: 'stylist-1', user: { username: 'ana', firstName: 'Ana', lastName: 'Test' } }, { id: 'stylist-2', user: { username: 'bea', firstName: 'Bea', lastName: 'Test' } }] })
            if (path === '/api/stylists/admin/stylist-1/services') {
              attempts++
              if (attempts === 1) await initialGate
              if (attempts <= 4) return route.fulfill({ status: 503, json: { message: 'unavailable' } })
              await retryGate
              await route.fulfill({ json: [{ service: { id: 'service-1', name: 'Service Ana', price: 50 } }] })
              completed = true
              return
            }
            if (path === '/api/stylists/admin/stylist-2/services') return route.fulfill({ json: [{ service: { id: 'service-2', name: 'Service Bea', price: 70 } }] })
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
            const service = dialog.locator('#manual-service')
            await expect(stylist.locator('option[value="stylist-1"]')).toHaveCount(1)
            await tabTo(page, stylist)
            await page.keyboard.press('ArrowDown')
            await page.keyboard.press('Enter')
            await expect(stylist).toHaveValue('stylist-1')
            await expect.poll(() => attempts).toBe(1)
            const status = dialog.getByRole('status').filter({ hasText: language === 'bs' ? 'Učitavanje usluga…' : 'Loading services…' })
            await expect(service).toBeDisabled()
            await expect(status).toBeVisible()
            await expect(service).toHaveAccessibleDescription(await status.textContent() ?? '')
            releaseInitial()
            const error = dialog.getByText(language === 'bs' ? 'Usluge se ne mogu učitati.' : 'Could not load services.', { exact: true })
            const retry = dialog.getByRole('button', { name: language === 'bs' ? 'Ponovo učitaj usluge' : 'Reload services' })
            await expect(error).toBeVisible({ timeout: 15_000 })
            await expect(service).toBeDisabled()
            await expect(service).toHaveAccessibleDescription(await error.textContent() ?? '')
            await expect.poll(() => attempts).toBe(2)
            if (viewport === 'desktop' && mode === 'retained') {
              await expect.poll(async () => (await settleAnimations(page))?.stillRunning ?? -1).toBe(0)
              const results = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(AXE_RULE_TAGS).analyze()
              const findings = { violations: results.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(node => ({ target: node.target, html: node.html, summary: node.failureSummary })) })), incomplete: results.incomplete.map(({ id, nodes }) => ({ id, nodes: nodes.map(node => ({ target: node.target, html: node.html, summary: node.failureSummary })) })) }
              console.log(`M7_INCOME_SERVICE_ERROR_${theme.toUpperCase()}_${language.toUpperCase()} ${JSON.stringify(findings)}`)
              await test.info().attach('income-service-error-axe', { body: JSON.stringify(findings, null, 2), contentType: 'application/json' })
              expect(assertableViolations(results.violations)).toEqual([])
              expect(results.violations.filter(item => item.tags.includes('wcag2aaa'))).toEqual([])
            }
            await tabTo(page, retry)
            await page.keyboard.press('Enter')
            await expect.poll(() => attempts, { timeout: 15_000 }).toBe(4)
            await expect(error).toBeVisible({ timeout: 15_000 })
            await expect(retry).toBeFocused()
            await page.keyboard.press('Space')
            await expect.poll(() => attempts).toBe(5)
            await expect(status).toBeVisible()
            await expect(retry).toHaveAttribute('aria-disabled', 'true')
            await expect(retry).toBeFocused()
            await page.keyboard.press('Enter')
            expect(attempts).toBe(5)
            if (mode === 'closed') {
              await tabTo(page, dialog.getByRole('button', { name: /^odustani$|^cancel$/i }))
              await page.keyboard.press('Enter')
              await expect(dialog).toBeHidden()
              await expect(trigger).toBeFocused()
              releaseRetry()
              await expect.poll(() => completed).toBe(true)
              await expect(trigger).toBeFocused()
            } else if (mode === 'switch') {
              await tabTo(page, stylist)
              await page.keyboard.press('ArrowDown')
              await page.keyboard.press('Enter')
              await expect(stylist).toHaveValue('stylist-2')
              await expect(service.locator('option[value="service-2"]')).toHaveCount(1)
              await expect(service).toBeEnabled()
              await expect(stylist).toBeFocused()
              releaseRetry()
              await expect.poll(() => completed).toBe(true)
              await expect(stylist).toBeFocused()
              await expect(service.locator('option[value="service-1"]')).toHaveCount(0)
            } else if (mode === 'moved') {
              const date = dialog.locator('#manual-date')
              await tabTo(page, date)
              releaseRetry()
              await expect(service).toBeEnabled()
              await expect(date).toBeFocused()
            } else {
              releaseRetry()
              await expect(service).toBeEnabled()
              await expect(service).toBeFocused()
            }
            if (mode !== 'closed') {
              await expect(retry).toHaveCount(0)
              await expect(service).not.toHaveAttribute('aria-describedby')
              await expect(service.locator(`option[value="${mode === 'switch' ? 'service-2' : 'service-1'}"]`)).toHaveCount(1)
              if (mode !== 'retained') await tabTo(page, service)
              await page.keyboard.press('ArrowDown')
              await page.keyboard.press('Enter')
              await expect(service).toHaveValue(mode === 'switch' ? 'service-2' : 'service-1')
            }
            expect(writes).toEqual([])
          } finally { releaseInitial(); releaseRetry() }
        })
      }
    }
  }
}
