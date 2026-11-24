import { expect, test } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const pair = { id: 'pair-1', before: { pathOriginal: '/brand/pair-before.jpg' }, after: { pathOriginal: '/brand/pair-after.jpg' } }

for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    for (const scenario of ['later-pair', 'later-error', 'exhausted'] as const) {
      test(`empty gallery page with more results remains navigable ${language} ${width} ${scenario}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 })
        await page.addInitScript(lang => {
          localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang)
          Reflect.deleteProperty(window, 'IntersectionObserver')
        }, language)
        await page.route('**/uploads/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>' }))
        const offsets: string[] = []
        let release!: () => void
        const gate = new Promise<void>(resolve => { release = resolve })
        await page.route('**/api/**', async route => {
          const url = new URL(route.request().url())
          if (url.pathname === '/api/settings/public') return route.fulfill({ json: [] })
          if (url.pathname === '/api/users/profile') return route.fulfill({ json: profile })
          if (url.pathname === '/api/services/admin/services/svc') return route.fulfill({ json: { id: 'svc', name: 'Fixture service', durationMinutes: 30 } })
          if (url.pathname === '/api/daily-log/before-after') {
            const offset = url.searchParams.get('offset') ?? ''; offsets.push(offset)
            if (offset === '0') return route.fulfill({ json: { items: [], hasMore: true, nextOffset: 18 } })
            await gate
            if (scenario === 'later-error' && offsets.length === 2) return route.fulfill({ status: 500, json: {} })
            return route.fulfill({ json: { items: scenario === 'exhausted' ? [] : [pair], hasMore: false, nextOffset: 19 } })
          }
          return route.fulfill({ json: {} })
        })
        await page.goto('/admin/services/svc/work-gallery', { waitUntil: 'networkidle' })
        const empty = page.getByText(language === 'bs' ? 'Nema dostupnih transformacija za ovaj servis.' : 'There are no available transformations for this service.', { exact: true })
        await expect(empty).toHaveCount(0)
        const more = page.getByRole('button', { name: language === 'bs' ? 'Učitaj još radova' : 'Load more work' })
        const count = page.getByText(language === 'bs' ? 'Učitanih poređenja: 0' : 'Comparisons loaded: 0')
        await more.focus(); await page.keyboard.press('Enter')
        await expect(count).toBeFocused()
        release()
        if (scenario === 'later-error') {
          const alert = page.getByRole('alert')
          await expect(alert).toBeVisible()
          await expect(empty).toHaveCount(0)
          await alert.getByRole('button', { name: language === 'bs' ? 'Pokušaj ponovo' : 'Try again' }).click()
        }
        if (scenario === 'exhausted') {
          await expect(empty).toBeVisible()
          await expect(count).toBeFocused()
        }
        else await expect(page.locator('img[src*="pair-before.jpg"]')).toHaveCount(1)
        expect(offsets).toEqual(scenario === 'later-error' ? ['0', '18', '18'] : ['0', '18'])
      })
    }
  }
}

for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`automatic observer can advance across consecutive empty pages ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.addInitScript(lang => {
        localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang)
        window.IntersectionObserver = class {
          private timer = 0
          root = null; rootMargin = ''; thresholds = []
          constructor(private callback: IntersectionObserverCallback) {}
          observe() { this.timer = window.setTimeout(() => this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver), 0) }
          unobserve() { window.clearTimeout(this.timer) }
          disconnect() { window.clearTimeout(this.timer) }
          takeRecords() { return [] }
        } as unknown as typeof IntersectionObserver
      }, language)
      await page.route('**/uploads/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>' }))
      const offsets: string[] = []
      await page.route('**/api/**', route => {
        const url = new URL(route.request().url())
        if (url.pathname === '/api/settings/public') return route.fulfill({ json: [] })
        if (url.pathname === '/api/users/profile') return route.fulfill({ json: profile })
        if (url.pathname === '/api/services/admin/services/svc') return route.fulfill({ json: { id: 'svc', name: 'Fixture service', durationMinutes: 30 } })
        if (url.pathname === '/api/daily-log/before-after') {
          const offset = url.searchParams.get('offset') ?? ''; offsets.push(offset)
          if (offset === '0' || offset === '18') return route.fulfill({ json: { items: [], hasMore: true, nextOffset: Number(offset) + 18 } })
          return route.fulfill({ json: { items: [pair], hasMore: false, nextOffset: 37 } })
        }
        return route.fulfill({ json: {} })
      })
      await page.goto('/admin/services/svc/work-gallery', { waitUntil: 'networkidle' })
      await expect(page.locator('img[src*="pair-before.jpg"]')).toHaveCount(1)
      expect(offsets).toEqual(['0', '18', '36'])
      await expect(page.getByRole('button', { name: language === 'bs' ? 'Učitaj još radova' : 'Load more work' })).toHaveCount(0)
    })
  }
}
