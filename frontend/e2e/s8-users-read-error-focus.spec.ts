import { expect, test } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    for (const scenario of ['page', 'search'] as const) {
      for (const focus of ['stay', 'leave'] as const) {
        test(`failed ${scenario} read restores focus only if it was in removed users panel ${language} ${width} ${focus}`, async ({ page }) => {
          await page.setViewportSize({ width, height: 800 })
          await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
          let release!: () => void, started = false
          const gate = new Promise<void>(resolve => { release = resolve })
          await page.route('**/api/**', async route => {
            const url = new URL(route.request().url()), path = url.pathname
            if (path === '/api/settings/public') return route.fulfill({ json: [] })
            if (path === '/api/users/profile') return route.fulfill({ json: profile })
            if (path === '/api/users/clients/admin') {
              if (url.searchParams.get('page') === '1' || url.searchParams.has('q')) { started = true; await gate; return route.fulfill({ status: 500, json: {} }) }
              return route.fulfill({ json: { items: [], total: 201, page: 0, pageSize: 20 } })
            }
            if (path === '/api/users/system-admins' || path === '/api/users/stylists' || path === '/api/users/password-reset-candidates') return route.fulfill({ json: [] })
            return route.fulfill({ json: {} })
          })
          try {
            await page.goto('/admin/users', { waitUntil: 'networkidle' })
            const root = page.locator('[data-admin-users]')
            if (scenario === 'page') {
              const button = root.getByRole('button', { name: '2', exact: true })
              await button.focus(); await page.keyboard.press('Enter')
              await expect(button).toBeFocused()
            } else {
              const input = root.getByRole('textbox', { name: language === 'bs' ? 'Pretraži klijente' : 'Search clients' })
              await input.fill('changed')
              await expect(input).toBeFocused()
            }
            await expect.poll(() => started).toBe(true)
            const elsewhere = page.getByRole('banner').getByRole('link').first()
            if (focus === 'leave') await elsewhere.focus()
            release()
            await expect(root.getByRole('alert')).toBeVisible()
            if (focus === 'leave') await expect(elsewhere).toBeFocused()
            else await expect(root.getByRole('heading', { level: 1 })).toBeFocused()
          } finally { release() }
        })
      }
    }
  }
}
