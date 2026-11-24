import { expect, test } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
for (const kind of ['service', 'pairs'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const width of [320, 1280]) {
      test(`gallery ${kind} retry keeps a stable focus without reclaiming it on completion ${language} ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 })
        await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
        let attempts = 0, release!: () => void
        const gate = new Promise<void>(resolve => { release = resolve })
        await page.route('**/api/**', async route => {
          const url = new URL(route.request().url())
          if (url.pathname === '/api/settings/public') return route.fulfill({ json: [] })
          if (url.pathname === '/api/users/profile') return route.fulfill({ json: profile })
          const service = url.pathname === '/api/services/admin/services/svc'
          const pairs = url.pathname === '/api/daily-log/before-after'
          if ((kind === 'service' && service) || (kind === 'pairs' && pairs)) {
            attempts++
            if (attempts === 1) return route.fulfill({ status: 500, json: {} })
            await gate
          }
          if (service) return route.fulfill({ json: { id: 'svc', name: 'Fixture service', durationMinutes: 30 } })
          if (pairs) return route.fulfill({ json: { items: [], hasMore: false, nextOffset: 0 } })
          return route.fulfill({ json: {} })
        })
        try {
          await page.goto('/admin/services/svc/work-gallery', { waitUntil: 'networkidle' })
          const alert = page.getByRole('alert')
          await expect(alert).toBeVisible()
          await alert.getByRole('button', { name: language === 'bs' ? 'Pokušaj ponovo' : 'Try again' }).click()
          const heading = page.getByRole('heading', { level: 1 })
          await expect(heading).toBeFocused()
          const link = page.getByRole('banner').getByRole('link').first()
          await link.focus()
          release()
          await expect.poll(() => attempts).toBe(2)
          if (kind === 'service') await expect(page.getByText('Fixture service', { exact: true })).toBeVisible()
          else await expect(alert).toHaveCount(0)
          await expect(link).toBeFocused()
        } finally { release() }
      })
    }
  }
}
