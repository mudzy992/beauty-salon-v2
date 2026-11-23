import { expect, test } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
for (const lang of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`work gallery loading retains heading and announces status ${lang} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.addInitScript(language => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', language) }, lang)
      let release!: () => void, started = false
      const gate = new Promise<void>(resolve => { release = resolve })
      await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname
        if (path === '/api/settings/public') return route.fulfill({ json: [] })
        if (path === '/api/users/profile') return route.fulfill({ json: profile })
        if (path === '/api/services/admin/services/svc-1') { started = true; await gate; return route.fulfill({ json: { id: 'svc-1', name: 'Fixture service', durationMinutes: 30 } }) }
        return route.fulfill({ json: [] })
      })
      try {
        await page.goto('/admin/services/svc-1/work-gallery', { waitUntil: 'domcontentloaded' })
        await expect.poll(() => started).toBe(true)
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
        await expect(page.getByRole('status').filter({ hasText: lang === 'en' ? 'Loading service' : 'Učitavanje usluge' })).toBeVisible()
      } finally { release() }
      await expect(page.getByText('Fixture service')).toBeVisible()
    })
  }
}
