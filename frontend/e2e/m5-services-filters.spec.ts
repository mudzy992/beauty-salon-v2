import { expect, test, type Locator, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { AXE_RULE_TAGS, assertableViolations } from './axe-coverage.mjs'
import { settleAnimations } from './settle'

async function tabTo(page: Page, target: Locator) {
  for (let i = 0; i < 150 && !(await target.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
  await expect(target).toBeFocused()
}

// Synthetic catalogue, no writes; browser emulation does not substitute for OS contrast themes.
for (const theme of ['classic', 'light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const palette of ['light', 'dark'] as const) {
      test(`M5 services filter ${theme} ${language} ${palette}`, async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 })
        await page.emulateMedia({ forcedColors: 'active', colorScheme: palette, reducedMotion: 'reduce' })
        await page.addInitScript(({ mode, locale }) => {
          localStorage.removeItem('token')
          localStorage.removeItem('nejra.theme')
          localStorage.setItem('nejra.theme.mode', mode)
          localStorage.setItem('APP_LOCALE', locale)
        }, { mode: theme === 'dark' ? 'dark' : 'light', locale: language })
        const writes: string[] = []
        await page.route('**/api/**', route => {
          const req = route.request(), path = new URL(req.url()).pathname
          if (req.method() !== 'GET') { writes.push(`${req.method()} ${path}`); return route.abort() }
          if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_active_skin', value: theme === 'classic' ? 'classic' : 'aurum' }, { key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
          if (path === '/api/services/categories') return route.fulfill({ json: [{ id: 'cat-a', name: 'Fixture Alpha' }, { id: 'cat-b', name: 'Fixture Beta' }] })
          if (path === '/api/services/subcategories') return route.fulfill({ json: [{ id: 'sub-a', categoryId: 'cat-a', name: 'Fixture first' }, { id: 'sub-b', categoryId: 'cat-b', name: 'Fixture second' }] })
          if (path === '/api/services') return route.fulfill({ json: [{ id: 'service-a', subcategoryId: 'sub-a', name: 'Fixture cut', durationMinutes: 45 }, { id: 'service-b', subcategoryId: 'sub-b', name: 'Fixture color', durationMinutes: 60 }] })
          return route.fulfill({ json: {} })
        })
        await page.goto('/usluge', { waitUntil: 'networkidle' })
        await expect(page.locator('html')).toHaveAttribute('data-skin', theme === 'classic' ? 'classic' : 'aurum')
        if (theme !== 'classic') await expect(page.locator('html')).toHaveAttribute('data-mode', theme)
        await expect(page.locator('html')).toHaveAttribute('lang', language)
        expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true)
        expect(await page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches)).toBe(palette === 'dark')
        const group = page.getByRole('group', { name: /istražite po kategoriji|or explore by category/i })
        const all = group.getByRole('button', { name: /sve usluge|all services/i })
        const alpha = group.getByRole('button', { name: 'Fixture Alpha' })
        const beta = group.getByRole('button', { name: 'Fixture Beta' })
        const buttons = [all, alpha, beta]
        const checkState = async (selected: Locator) => {
          await expect(selected).toHaveAttribute('aria-pressed', 'true')
          for (const button of buttons) {
            const isSelected = await button.getAttribute('aria-pressed') === 'true'
            const style = await button.evaluate(el => {
              const css = getComputedStyle(el)
              return { width: css.borderWidth, style: css.borderStyle, color: css.borderColor, background: css.backgroundColor }
            })
            expect(style.style, JSON.stringify(style)).toBe('solid')
            expect(style.color, JSON.stringify(style)).not.toBe(style.background)
            if (isSelected) expect(parseFloat(style.width), JSON.stringify(style)).toBeGreaterThanOrEqual(3)
            else expect(parseFloat(style.width), JSON.stringify(style)).toBeLessThan(3)
          }
        }
        await checkState(all)
        await expect(page.locator('#service-catalog h2')).toHaveText(/usluge|services/i)
        await tabTo(page, alpha)
        const checkFocus = async (target: Locator) => {
          const focus = await target.evaluate(el => {
            const css = getComputedStyle(el), rect = el.getBoundingClientRect()
            const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
            return { visible: el.matches(':focus-visible'), width: css.outlineWidth, style: css.outlineStyle, color: css.outlineColor, background: css.backgroundColor, center: !!hit && (hit === el || el.contains(hit)) }
          })
          expect(focus.visible, JSON.stringify(focus)).toBe(true)
          expect(focus.center, JSON.stringify(focus)).toBe(true)
          expect(focus.style, JSON.stringify(focus)).toBe('solid')
          expect(parseFloat(focus.width), JSON.stringify(focus)).toBeGreaterThanOrEqual(2)
          expect(focus.color, JSON.stringify(focus)).not.toBe(focus.background)
          expect(focus.color, JSON.stringify(focus)).not.toBe('rgba(0, 0, 0, 0)')
        }
        await checkFocus(alpha)
        await page.keyboard.press('Enter')
        await checkFocus(alpha)
        await expect(alpha).toHaveAttribute('aria-pressed', 'true')
        await expect(page.getByRole('heading', { name: 'Fixture Alpha' })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Fixture Beta' })).toHaveCount(0)
        await page.keyboard.press('Tab')
        await expect(beta).toBeFocused()
        await checkState(alpha)
        await page.keyboard.press('Space')
        await expect(page.getByRole('heading', { name: 'Fixture Beta' })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Fixture Alpha' })).toHaveCount(0)
        await page.keyboard.press('Shift+Tab')
        await expect(alpha).toBeFocused()
        await checkState(beta)
        await page.keyboard.press('Shift+Tab')
        await expect(all).toBeFocused()
        await page.keyboard.press('Enter')
        await expect(page.getByRole('heading', { name: 'Fixture Alpha' })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Fixture Beta' })).toBeVisible()
        await checkState(all)
        if (palette === 'light') {
          await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'reduce' })
          expect(await settleAnimations(page)).not.toBeNull()
          const results = await new AxeBuilder({ page }).include('[data-aurum-page="services"]').withTags(AXE_RULE_TAGS).analyze()
          const findings = { violations: results.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(node => ({ target: node.target, html: node.html, summary: node.failureSummary })) })), incomplete: results.incomplete.map(({ id, nodes }) => ({ id, nodes: nodes.map(node => ({ target: node.target, html: node.html, summary: node.failureSummary })) })) }
          console.log(`M7_SERVICES_${theme.toUpperCase()}_${language.toUpperCase()} ${JSON.stringify(findings)}`)
          await test.info().attach('services-axe-findings', { body: JSON.stringify(findings, null, 2), contentType: 'application/json' })
          expect(results.violations.filter(item => item.id === 'heading-order')).toEqual([])
          expect(assertableViolations(results.violations)).toEqual([])
        }
        expect(writes).toEqual([])
      })
    }
  }
}
