import { expect, test } from '@playwright/test'

// No real clients or photographs; all GET responses are synthetic and all writes blocked.
for (const theme of ['classic', 'light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const placement of ['standalone', 'categories'] as const) {
      test(`M4 gallery comparison names ${theme} ${language} ${placement}`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.addInitScript(({ mode, locale }) => {
          localStorage.removeItem('token')
          localStorage.removeItem('nejra.theme')
          localStorage.setItem('nejra.theme.mode', mode)
          localStorage.setItem('APP_LOCALE', locale)
        }, { mode: theme === 'dark' ? 'dark' : 'light', locale: language })
        const writes: string[] = []
        const categories = ['Fixture Alpha', 'Fixture Beta'].map((name, index) => ({ id: `cat-${index}`, name, sortOrder: index, autoPublishConsentedPairs: true, _count: { images: 0 }, images: [] }))
        await page.route('**/api/**', route => {
          const req = route.request(), path = new URL(req.url()).pathname
          if (req.method() !== 'GET') { writes.push(`${req.method()} ${path}`); return route.abort() }
          if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_active_skin', value: theme === 'classic' ? 'classic' : 'aurum' }, { key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
          if (path === '/api/gallery/categories') return route.fulfill({ json: placement === 'categories' ? categories : [] })
          if (path === '/api/gallery/categories/cat-0') return route.fulfill({ json: categories[0] })
          if (path === '/api/gallery/categories/cat-1') return route.fulfill({ json: categories[1] })
          if (path === '/api/daily-log/before-after') return route.fulfill({ json: { items: ['one', 'two'].map(id => ({ id, before: { pathOriginal: '/brand/aurum-hero-editorial.jpg' }, after: { pathOriginal: '/brand/aurum-hero-editorial.jpg' } })) } })
          return route.fulfill({ json: {} })
        })
        await page.goto('/galerija', { waitUntil: 'networkidle' })
        await expect(page.locator('html')).toHaveAttribute('data-skin', theme === 'classic' ? 'classic' : 'aurum')
        if (theme !== 'classic') await expect(page.locator('html')).toHaveAttribute('data-mode', theme)
        await expect(page.locator('html')).toHaveAttribute('lang', language)
        const sliders = page.getByRole('slider')
        await expect(sliders).toHaveCount(placement === 'standalone' ? 2 : 4)
        const labels = [1, 2].map(index => language === 'bs' ? `Poređenje fotografija prije i poslije, ${index} od 2` : `Before and after photo comparison, ${index} of 2`)
        const expected = placement === 'standalone' ? labels : categories.flatMap(category => labels.map(label => `${category.name}: ${label}`))
        for (const [index, label] of expected.entries()) await expect(sliders.nth(index)).toHaveAccessibleName(label)
        expect(new Set(expected).size).toBe(expected.length)
        for (let i = 0; i < 120 && !(await sliders.first().evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
        await expect(sliders.first()).toBeFocused()
        await page.keyboard.press('ArrowRight')
        await expect(sliders.first()).toHaveAttribute('aria-valuenow', '52')
        await page.keyboard.press('Tab')
        await expect(sliders.nth(1)).toBeFocused()
        await page.keyboard.press('ArrowLeft')
        await expect(sliders.nth(1)).toHaveAttribute('aria-valuenow', '48')
        await expect(sliders.first()).toHaveAttribute('aria-valuenow', '52')
        expect(writes).toEqual([])
      })
    }
  }
}
