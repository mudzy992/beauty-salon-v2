import { expect, test } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const category = { id: 'cat', name: 'Category fixture', isActive: true, sortOrder: 0 }
for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    for (const scenario of ['retry', 'save'] as const) {
      test(`service ${scenario} preserves focus during pending refresh ${language} ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 })
        await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
        let reads = 0, release!: () => void
        const gate = new Promise<void>(resolve => { release = resolve })
        await page.route('**/api/**', async route => {
          const req = route.request(), path = new URL(req.url()).pathname
          if (path === '/api/settings/public') return route.fulfill({ json: [] })
          if (path === '/api/users/profile') return route.fulfill({ json: profile })
          if (path === '/api/services/admin/categories') {
            reads++
            if (reads === 1 && scenario === 'retry') return route.fulfill({ status: 500, json: {} })
            if (reads === 2) await gate
            return route.fulfill({ json: [category] })
          }
          if (path === '/api/services/admin/subcategories' || path === '/api/services/admin/services') return route.fulfill({ json: [] })
          if (path === '/api/services/categories' && req.method() === 'POST') return route.fulfill({ json: {} })
          return route.fulfill({ json: {} })
        })
        try {
          await page.goto('/admin/services', { waitUntil: 'networkidle' })
          const heading = page.getByRole('heading', { level: 1 })
          if (scenario === 'retry') {
            const retry = page.getByRole('button', { name: language === 'bs' ? 'Pokušaj ponovo' : 'Try again' })
            await retry.focus(); await page.keyboard.press('Enter')
          } else {
            const add = page.getByRole('button', { name: language === 'bs' ? 'Nova kategorija' : 'New category' })
            await add.focus(); await page.keyboard.press('Enter')
            const dialog = page.getByRole('dialog')
            await dialog.locator('#services-common-name').fill('Created category')
            await dialog.getByRole('button', { name: language === 'bs' ? 'Sačuvaj' : 'Save', exact: true }).click()
          }
          await expect.poll(() => reads).toBe(2)
          await expect(page.getByRole('status').filter({ hasText: language === 'bs' ? 'Učitavanje' : 'Loading' })).toBeVisible()
          await expect(heading).toBeFocused()
          await page.getByRole('banner').getByRole('link').first().focus()
          const movedFocus = await page.evaluate(() => document.activeElement?.outerHTML)
          release()
          await expect(page.getByRole('button', { name: /Category fixture/, expanded: false })).toBeVisible()
          await expect.poll(() => page.evaluate(() => document.activeElement?.outerHTML)).toBe(movedFocus)
        } finally { release() }
      })
    }
  }
}
