import { expect, test, type Locator, type Page } from '@playwright/test'

async function tabTo(page: Page, target: Locator) {
  for (let i = 0; i < 80 && !(await target.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
  await expect(target).toBeFocused()
}

// Chromium emulation is not a real operating-system high-contrast test.
for (const theme of ['light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    test(`M5 forced-colors login ${theme} ${language}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
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
        if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
        return route.fulfill({ json: {} })
      })
      await page.goto('/login', { waitUntil: 'networkidle' })
      await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
      await expect(page.locator('html')).toHaveAttribute('lang', language)
      const username = page.locator('#usernameOrEmail'), password = page.locator('#password')
      const submit = page.locator('form').getByRole('button', { name: /^prijava$|^log in$|^sign in$/i })
      await expect(username).toHaveAccessibleName(/korisničko ime|username/i)
      await expect(password).toHaveAccessibleName(/lozinka|password/i)
      await expect(submit).toBeVisible()
      for (const target of [username, password, submit]) {
        await tabTo(page, target)
        const indicator = await target.evaluate(el => {
          const style = getComputedStyle(el), rect = el.getBoundingClientRect()
          const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
          return { visible: el.matches(':focus-visible'), outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, outlineColor: style.outlineColor, background: style.backgroundColor, center: !!hit && (hit === el || el.contains(hit)) }
        })
        expect(indicator.visible, JSON.stringify(indicator)).toBe(true)
        expect(indicator.center, JSON.stringify(indicator)).toBe(true)
        expect(indicator.outlineStyle, JSON.stringify(indicator)).not.toBe('none')
        expect(parseFloat(indicator.outlineWidth), JSON.stringify(indicator)).toBeGreaterThanOrEqual(2)
        expect(indicator.outlineColor, JSON.stringify(indicator)).not.toBe('rgba(0, 0, 0, 0)')
        expect(indicator.outlineColor, JSON.stringify(indicator)).not.toBe(indicator.background)
      }
      expect(writes).toEqual([])
    })
  }
}
