import { expect, test } from '@playwright/test'

// Synthetic admin session; no backend writes. Forced colors is browser emulation, not OS validation.
for (const theme of ['light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const colors of ['none', 'active'] as const) {
      test(`M3 admin route and skip-link focus ${theme} ${language} ${colors}`, async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 })
        await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: colors })
        await page.addInitScript(({ mode, locale }) => {
          localStorage.setItem('token', 'fixture-admin-token')
          localStorage.removeItem('nejra.theme')
          localStorage.setItem('nejra.theme.mode', mode)
          localStorage.setItem('APP_LOCALE', locale)
        }, { mode: theme === 'dark' ? 'dark' : 'light', locale: language })
        const writes: string[] = []
        await page.route('**/api/**', route => {
          const req = route.request(), path = new URL(req.url()).pathname
          if (req.method() !== 'GET') { writes.push(`${req.method()} ${path}`); return route.abort() }
          if (path === '/api/settings/public') return route.fulfill({ json: [
            { key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' },
          ] })
          if (path === '/api/users/profile') return route.fulfill({ json: {
            id: 'fixture-admin', username: 'test', firstName: 'Test', lastName: 'Admin', email: 'admin@example.test',
            gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'],
          } })
          if (path === '/api/reservations') return route.fulfill({ json: [] })
          return route.fulfill({ json: {} })
        })
        await page.goto('/admin/finance', { waitUntil: 'networkidle' })
        await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
        await expect(page.locator('html')).toHaveAttribute('lang', language)
        const main = page.locator('main#main')
        const verifyMain = async () => {
          await expect(main).toBeFocused()
          expect(await main.evaluate(el => el.matches(':focus-visible'))).toBe(true)
          const indicator = await main.evaluate(el => {
            const style = getComputedStyle(el), rect = el.getBoundingClientRect()
            const header = document.querySelector('[data-admin-header]')?.getBoundingClientRect()
            return { style: style.outlineStyle, color: style.outlineColor, width: style.outlineWidth, top: rect.top, headerBottom: header?.bottom ?? 0 }
          })
          expect(indicator.style).not.toBe('none')
          expect(indicator.color).not.toBe('rgba(0, 0, 0, 0)')
          expect(parseFloat(indicator.width)).toBeGreaterThanOrEqual(2)
          expect(indicator.top).toBeGreaterThanOrEqual(indicator.headerBottom - 1)
        }
        await page.keyboard.press('Tab')
        const skip = page.locator('a[href="#main"]')
        await expect(skip).toBeFocused()
        await page.keyboard.press('Enter')
        await verifyMain()
        // Start again from the browser document so the sidebar is reached by Tab.
        await page.goto('/admin/finance', { waitUntil: 'networkidle' })
        const link = page.locator('[data-admin-sidebar] a[href="/admin/reservations"]')
        await expect(link).toHaveCount(1)
        for (let i = 0; i < 100 && !(await link.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
        await expect(link).toBeFocused()
        await page.keyboard.press('Enter')
        await expect.poll(() => new URL(page.url()).pathname).toBe('/admin/reservations')
        await verifyMain()
        await page.keyboard.press('Tab')
        expect(await main.evaluate(el => el.contains(document.activeElement))).toBe(true)
        expect(writes).toEqual([])
      })
    }
  }
}
