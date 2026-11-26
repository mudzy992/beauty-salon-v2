import { expect, test, type Locator, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { AXE_RULE_TAGS, assertableViolations } from './axe-coverage.mjs'
import { settleAnimations } from './settle'

async function tabTo(page: Page, target: Locator) {
  for (let i = 0; i < 150 && !(await target.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
  await expect(target).toBeFocused()
}

// Synthetic finance records; no POST is sent. The stylist lookup is deliberately held.
for (const theme of ['light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    test(`M4 income stylist lookup loading ${theme} ${language}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.addInitScript(({ mode, locale }) => {
        localStorage.setItem('token', 'fixture-admin-token')
        localStorage.removeItem('nejra.theme')
        localStorage.setItem('nejra.theme.mode', mode)
        localStorage.setItem('APP_LOCALE', locale)
      }, { mode: theme === 'dark' ? 'dark' : 'light', locale: language })
      const book = { id: 'book-1', year: 2026, month: 3, totalRevenue: 0, totalTips: 0, openedAt: '2026-03-01T00:00:00Z', closedAt: null, entries: [], manualEntries: [], lockEvents: [], manualAudits: [] }
      let release!: () => void
      const gate = new Promise<void>(resolve => { release = resolve })
      let requests = 0
      const writes: string[] = []
      await page.route('**/api/**', async route => {
        const req = route.request(), path = new URL(req.url()).pathname
        if (req.method() !== 'GET') { writes.push(`${req.method()} ${path}`); return route.abort() }
        if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
        if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
        if (path === '/api/income-books') return route.fulfill({ json: [book] })
        if (path === '/api/income-books/book-1') return route.fulfill({ json: book })
        if (path === '/api/income-books/book-1/integrity') return route.fulfill({ json: { bookId: 'book-1', isLocked: false, missingCount: 0, orphanedCount: 0, isHealthy: true, missing: [], orphaned: [] } })
        if (path === '/api/stylists/admin') { requests++; await gate; return route.fulfill({ json: [{ id: 'stylist-1', user: { username: 'ana', firstName: 'Ana', lastName: 'Test' } }] }) }
        if (path === '/api/stylists/admin/stylist-1/services') return route.fulfill({ json: [{ service: { id: 'service-1', name: 'Fixture service', price: 50 } }] })
        if (path === '/api/users/clients') return route.fulfill({ json: { items: [] } })
        return route.fulfill({ json: {} })
      })
      try {
        await page.goto('/admin/finance?tab=income', { waitUntil: 'domcontentloaded' })
        await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
        await expect(page.locator('html')).toHaveAttribute('lang', language)
        const bookButton = page.getByRole('button', { name: /otvori knjigu.*2026|open book.*2026/i })
        await expect(bookButton).toBeVisible()
        await tabTo(page, bookButton)
        await page.keyboard.press('Enter')
        const trigger = page.getByRole('button', { name: /^ručni prihod$|^manual income$/i })
        await expect(trigger).toBeVisible()
        await tabTo(page, trigger)
        await page.keyboard.press('Enter')
        const dialog = page.getByRole('dialog')
        await expect(dialog).toBeVisible()
        await expect.poll(() => requests).toBeGreaterThan(0)
        const stylist = dialog.locator('#manual-stylist')
        const status = dialog.getByRole('status')
        await expect(stylist).toBeDisabled()
        await expect(status).toHaveText(language === 'bs' ? 'Učitavanje stilista…' : 'Loading stylists…')
        await expect(stylist).toHaveAccessibleDescription(language === 'bs' ? 'Učitavanje stilista…' : 'Loading stylists…')
        await expect(stylist.locator('option[value="stylist-1"]')).toHaveCount(0)
        await expect.poll(async () => (await settleAnimations(page))?.stillRunning ?? -1).toBe(0)
        const results = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(AXE_RULE_TAGS).analyze()
        const findings = { violations: results.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(node => ({ target: node.target, html: node.html, summary: node.failureSummary })) })), incomplete: results.incomplete.map(({ id, nodes }) => ({ id, nodes: nodes.map(node => ({ target: node.target, html: node.html, summary: node.failureSummary })) })) }
        console.log(`M7_INCOME_LOADING_${theme.toUpperCase()}_${language.toUpperCase()} ${JSON.stringify(findings)}`)
        await test.info().attach('income-loading-axe', { body: JSON.stringify(findings, null, 2), contentType: 'application/json' })
        expect(assertableViolations(results.violations)).toEqual([])
        expect(results.violations.filter(item => item.tags.includes('wcag2aaa'))).toEqual([])
        release()
        await expect(stylist.locator('option[value="stylist-1"]')).toHaveCount(1)
        await expect(stylist).toBeEnabled()
        await expect(status).toHaveCount(0)
        await expect(stylist).not.toHaveAttribute('aria-describedby')
        await tabTo(page, stylist)
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press('Enter')
        await expect(stylist).toHaveValue('stylist-1')
        const service = dialog.locator('#manual-service')
        await expect(service.locator('option[value="service-1"]')).toHaveCount(1)
        await expect(service).toBeEnabled()
        expect(writes).toEqual([])
      } finally { release() }
    })
  }
}
