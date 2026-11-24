import { expect, test } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const pair = (id: string) => ({ id, before: { pathOriginal: `/brand/${id}-before.jpg` }, after: { pathOriginal: `/brand/${id}-after.jpg` } })
for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    for (const observerMode of ['silent', 'missing'] as const) {
    test(`gallery can load the next page without intersection observation ${language} ${width} ${observerMode}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.addInitScript(({ lang, mode }) => {
        localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang)
        // Simulate an observer that never reports intersection, rather than relying on scroll.
        if (mode === 'missing') { Reflect.deleteProperty(window, 'IntersectionObserver'); return }
        window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return [] } root = null; rootMargin = ''; thresholds = [] } as unknown as typeof IntersectionObserver
      }, { lang: language, mode: observerMode })
      await page.route('**/uploads/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>' }))
      let release!: () => void, later = 0
      const gate = new Promise<void>(resolve => { release = resolve })
      await page.route('**/api/**', async route => {
        const url = new URL(route.request().url())
        if (url.pathname === '/api/settings/public') return route.fulfill({ json: [] })
        if (url.pathname === '/api/users/profile') return route.fulfill({ json: profile })
        if (url.pathname === '/api/services/admin/services/svc') return route.fulfill({ json: { id: 'svc', name: 'Fixture service', durationMinutes: 30 } })
        if (url.pathname === '/api/daily-log/before-after') {
          if (url.searchParams.get('offset') === '0') return route.fulfill({ json: { items: [pair('first')], hasMore: true, nextOffset: 1 } })
          later++; await gate
          return route.fulfill({ json: { items: [pair('second')], hasMore: false, nextOffset: 2 } })
        }
        return route.fulfill({ json: {} })
      })
      try {
        await page.goto('/admin/services/svc/work-gallery', { waitUntil: 'networkidle' })
        await expect(page.locator('img[src*="first-before.jpg"]')).toHaveCount(1)
        const more = page.getByRole('button', { name: language === 'bs' ? 'Učitaj još radova' : 'Load more work' })
        await expect(more).toBeVisible()
        await more.focus(); await page.keyboard.press('Enter')
        await expect.poll(() => later).toBe(1)
        await expect(page.getByRole('status').filter({ hasText: language === 'bs' ? 'Učitavanje' : 'Loading' })).toBeVisible()
        await expect(page.getByText(language === 'bs' ? 'Učitanih poređenja: 1' : 'Comparisons loaded: 1')).toBeFocused()
        const link = page.getByRole('banner').getByRole('link').first()
        await link.focus(); release()
        await expect(page.locator('img[src*="second-before.jpg"]')).toHaveCount(1)
        await expect(page.locator('img[src*="first-before.jpg"]')).toHaveCount(1)
        await expect(link).toBeFocused()
        await expect(more).toHaveCount(0)
        expect(later).toBe(1)
      } finally { release() }
    })
    }
  }
}
