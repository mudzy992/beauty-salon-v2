import { expect, test } from '@playwright/test'

// Public catalog responses are held, then fulfilled with empty synthetic data.
for (const theme of ['classic', 'light', 'dark'] as const) {
  for (const preference of ['reduce', 'no-preference'] as const) {
    test(`M6 public catalog loading ${theme} ${preference}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: preference })
      await page.addInitScript(({ mode }) => {
        localStorage.removeItem('token')
        localStorage.removeItem('nejra.theme')
        localStorage.setItem('nejra.theme.mode', mode)
        localStorage.setItem('APP_LOCALE', 'en')
      }, { mode: theme === 'dark' ? 'dark' : 'light' })
      let release!: () => void
      const gate = new Promise<void>(resolve => { release = resolve })
      const writes: string[] = []
      await page.route('**/api/**', async route => {
        const req = route.request(), path = new URL(req.url()).pathname
        if (req.method() !== 'GET') { writes.push(`${req.method()} ${path}`); return route.abort() }
        if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_active_skin', value: theme === 'classic' ? 'classic' : 'aurum' }, { key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
        if (path === '/api/services' || path === '/api/services/categories' || path === '/api/services/subcategories') { await gate; return route.fulfill({ json: [] }) }
        return route.fulfill({ json: {} })
      })
      await page.goto('/usluge', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('html')).toHaveAttribute('data-skin', theme === 'classic' ? 'classic' : 'aurum')
      const pulse = page.locator('#service-catalog .animate-pulse').first()
      await expect(pulse).toBeVisible()
      const css = await pulse.evaluate(el => {
        const style = getComputedStyle(el)
        return { duration: style.animationDuration, count: style.animationIterationCount, name: style.animationName }
      })
      expect(css.name).not.toBe('none')
      if (preference === 'reduce') {
        expect(parseFloat(css.duration), JSON.stringify(css)).toBeLessThanOrEqual(0.00001)
        expect(css.count).toBe('1')
      } else {
        expect(parseFloat(css.duration), JSON.stringify(css)).toBeGreaterThanOrEqual(1)
        expect(css.count).toBe('infinite')
      }
      release()
      await expect(pulse).toHaveCount(0)
      expect(writes).toEqual([])
    })
  }
}
