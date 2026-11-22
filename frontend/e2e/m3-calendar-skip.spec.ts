import { expect, test } from '@playwright/test'

// Forced colors is emulated in Chromium, not a real operating-system check.
for (const theme of ['classic', 'light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const colors of ['none', 'active'] as const) {
      test(`M3 calendar skip focus ${theme} ${language} ${colors}`, async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 })
        await page.emulateMedia({ forcedColors: colors, reducedMotion: 'reduce' })
        await page.addInitScript(({ mode, locale }) => {
          localStorage.setItem('token', 'fixture-admin-token')
          localStorage.removeItem('nejra.theme')
          localStorage.setItem('nejra.theme.mode', mode)
          localStorage.setItem('APP_LOCALE', locale)
        }, { mode: theme === 'dark' ? 'dark' : 'light', locale: language })
        await page.route('**/api/**', route => {
          const request = route.request(), path = new URL(request.url()).pathname
          if (request.method() !== 'GET') return route.abort()
          if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_active_skin', value: theme === 'classic' ? 'classic' : 'aurum' }, { key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
          if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
          if (path === '/api/reservations' || path === '/api/stylists') return route.fulfill({ json: [] })
          return route.fulfill({ json: {} })
        })
        await page.goto('/admin/reservations/calendar', { waitUntil: 'networkidle' })
        await expect(page.locator('html')).toHaveAttribute('data-skin', theme === 'classic' ? 'classic' : 'aurum')
        await expect(page.locator('html')).toHaveAttribute('lang', language)
        const skip = page.locator('a[href="#calendar-main"]')
        const main = page.locator('#calendar-main')
        // The initial route is lazy loaded: networkidle/html language can settle
        // while the calendar is still absent. Still require the first real Tab.
        await expect(skip).toBeAttached()
        await expect(main).toHaveAttribute('aria-busy', 'false')
        await page.keyboard.press('Tab')
        try {
          await expect(skip).toBeFocused()
        } catch (error) {
          const active = await page.evaluate(() => ({ tag: document.activeElement?.tagName, id: document.activeElement?.id, href: document.activeElement?.getAttribute('href') }))
          console.log(`::error title=M3 calendar skip ${theme} ${language} ${colors}::${JSON.stringify(active)}`)
          throw error
        }
        await page.keyboard.press('Enter')
        await expect(main).toBeFocused()
        await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
        const indicator = await main.evaluate(el => {
          const style = getComputedStyle(el)
          return { visible: el.matches(':focus-visible'), style: style.outlineStyle, color: style.outlineColor, width: style.outlineWidth, offset: style.outlineOffset }
        })
        expect(indicator.visible).toBe(true)
        expect(indicator.style).toBe('solid')
        expect(indicator.color).not.toBe('rgba(0, 0, 0, 0)')
        expect(parseFloat(indicator.width)).toBeGreaterThanOrEqual(3)
        expect(parseFloat(indicator.offset)).toBeLessThanOrEqual(-3)
        await page.keyboard.press('Tab')
        expect(await main.evaluate(el => el.contains(document.activeElement))).toBe(true)
      })
    }
  }
}
