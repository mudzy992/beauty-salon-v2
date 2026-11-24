import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    for (const scenario of ['retry', 'last-page', 'next-last', 'previous-first'] as const) {
      test(`user ${scenario} preserves stable focus through delayed reload ${language} ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 })
        await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
        let release!: () => void, attempts = 0, held = false
        const gate = new Promise<void>(resolve => { release = resolve })
        await page.route('**/api/**', async route => {
          const url = new URL(route.request().url()), path = url.pathname
          if (path === '/api/settings/public') return route.fulfill({ json: [] })
          if (path === '/api/users/profile') return route.fulfill({ json: profile })
          if (path === '/api/users/clients/admin') {
            attempts++
            const current = Number(url.searchParams.get('page'))
            if (scenario === 'retry' && attempts === 1) return route.fulfill({ status: 500, json: {} })
            if ((scenario === 'retry' && attempts === 2) || (scenario === 'last-page' && current === 10) || (scenario === 'next-last' && current === 1) || (scenario === 'previous-first' && current === 0 && attempts > 1)) {
              held = true; await gate
            }
            const total = scenario === 'last-page' ? 201 : 21
            return route.fulfill({ json: { items: [], total, page: current, pageSize: 20 } })
          }
          if (path === '/api/users/system-admins' || path === '/api/users/stylists' || path === '/api/users/password-reset-candidates') return route.fulfill({ json: [] })
          return route.fulfill({ json: {} })
        })
        try {
          await page.goto('/admin/users', { waitUntil: 'networkidle' })
          const root = page.locator('[data-admin-users]')
          if (scenario === 'retry') {
            await expect(root.locator('[data-admin-state="error"]')).toBeVisible()
            const axe = await new AxeBuilder({ page }).include('[data-admin-state="error"]').withRules(['button-name', 'label-content-name-mismatch', 'aria-valid-attr']).analyze()
            expect(axe.violations).toEqual([])
          }
          if (scenario === 'previous-first') {
            await root.getByRole('button', { name: language === 'bs' ? 'Sljedeća' : 'Next', exact: true }).click()
            await expect(root.getByRole('button', { name: '2', exact: true })).toHaveAttribute('aria-current', 'page')
          }
          const trigger = scenario === 'retry' ? root.getByRole('alert').getByRole('button', { name: language === 'bs' ? 'Pokušaj ponovo' : 'Try again' })
            : root.getByRole('button', { name: scenario === 'last-page' ? '11' : scenario === 'next-last' ? (language === 'bs' ? 'Sljedeća' : 'Next') : (language === 'bs' ? 'Prethodna' : 'Previous'), exact: true })
          await trigger.focus(); await page.keyboard.press('Enter')
          await expect.poll(() => held).toBe(true)
          await expect(root.getByRole('heading', { level: 1 })).toBeFocused()
          const elsewhere = page.getByRole('banner').getByRole('link').first()
          await elsewhere.focus()
          release()
          await expect(root.getByRole('status').filter({ hasText: language === 'bs' ? 'Učitavanje' : 'Loading' })).toHaveCount(0)
          await expect(elsewhere).toBeFocused()
        } finally { release() }
      })
    }
  }
}

for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`pagination retains focus when its control remains enabled ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
      await page.route('**/api/**', route => {
        const url = new URL(route.request().url()), path = url.pathname
        if (path === '/api/settings/public') return route.fulfill({ json: [] })
        if (path === '/api/users/profile') return route.fulfill({ json: profile })
        if (path === '/api/users/clients/admin') return route.fulfill({ json: { items: [], total: 201, page: Number(url.searchParams.get('page')), pageSize: 20 } })
        if (path === '/api/users/system-admins' || path === '/api/users/stylists' || path === '/api/users/password-reset-candidates') return route.fulfill({ json: [] })
        return route.fulfill({ json: {} })
      })
      await page.goto('/admin/users', { waitUntil: 'networkidle' })
      const root = page.locator('[data-admin-users]')
      const pageTwo = root.getByRole('button', { name: '2', exact: true })
      await pageTwo.focus(); await page.keyboard.press('Enter')
      await expect(pageTwo).toHaveAttribute('aria-current', 'page')
      await expect(pageTwo).toBeFocused()
      const next = root.getByRole('button', { name: language === 'bs' ? 'Sljedeća' : 'Next', exact: true })
      await next.focus(); await page.keyboard.press('Enter')
      await expect(root.getByRole('button', { name: '3', exact: true })).toHaveAttribute('aria-current', 'page')
      await expect(next).toBeEnabled()
      await expect(next).toBeFocused()
    })
  }
}
