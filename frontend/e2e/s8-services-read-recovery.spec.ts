import { expect, test } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`service catalogue loading retains heading and announces status ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
      let release!: () => void, started = false
      const gate = new Promise<void>(resolve => { release = resolve })
      await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname
        if (path === '/api/settings/public') return route.fulfill({ json: [] })
        if (path === '/api/users/profile') return route.fulfill({ json: profile })
        if (path === '/api/services/admin/categories') { started = true; await gate; return route.fulfill({ json: [] }) }
        if (path === '/api/services/admin/subcategories' || path === '/api/services/admin/services') return route.fulfill({ json: [] })
        return route.fulfill({ json: {} })
      })
      try {
        await page.goto('/admin/services', { waitUntil: 'domcontentloaded' })
        await expect.poll(() => started).toBe(true)
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
        await expect(page.getByRole('status').filter({ hasText: language === 'en' ? 'Loading' : 'Učitavanje' })).toBeVisible()
      } finally { release() }
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    })

    test(`service catalogue failed read has retry instead of empty result ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
      let attempts = 0
      await page.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname
        if (path === '/api/settings/public') return route.fulfill({ json: [] })
        if (path === '/api/users/profile') return route.fulfill({ json: profile })
        if (path === '/api/services/admin/categories') { attempts++; return route.fulfill(attempts === 1 ? { status: 500, json: {} } : { json: [{ id: 'cat', name: 'Recovered category', isActive: true, sortOrder: 0 }] }) }
        if (path === '/api/services/admin/subcategories' || path === '/api/services/admin/services') return route.fulfill({ json: [] })
        return route.fulfill({ json: {} })
      })
      await page.goto('/admin/services', { waitUntil: 'networkidle' })
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
      const retry = page.getByRole('button', { name: language === 'en' ? 'Try again' : 'Pokušaj ponovo' })
      await expect(retry).toBeVisible()
      await retry.click()
      await expect(page.getByRole('button', { name: /Recovered category/, expanded: false })).toBeVisible()
      expect(attempts).toBe(2)
    })
  }
}

for (const oldStatus of [200, 500]) {
  test(`stale catalogue retry ${oldStatus} cannot replace a newer retry`, async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', 'en') })
    let requests = 0, release!: () => void, oldStarted = false
    const gate = new Promise<void>(resolve => { release = resolve })
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/settings/public') return route.fulfill({ json: [] })
      if (path === '/api/users/profile') return route.fulfill({ json: profile })
      if (path === '/api/services/admin/categories') {
        requests++
        if (requests === 1) return route.fulfill({ status: 500, json: {} })
        if (requests === 2) {
          oldStarted = true
          await gate
          return route.fulfill(oldStatus === 200 ? { json: [{ id: 'old', name: 'Old category', isActive: true, sortOrder: 0 }] } : { status: 500, json: {} })
        }
        return route.fulfill({ json: [{ id: 'new', name: 'New category', isActive: true, sortOrder: 0 }] })
      }
      if (path === '/api/services/admin/subcategories' || path === '/api/services/admin/services') return route.fulfill({ json: [] })
      return route.fulfill({ json: {} })
    })
    await page.goto('/admin/services', { waitUntil: 'networkidle' })
    const retry = page.getByRole('button', { name: 'Try again' })
    await expect(retry).toBeVisible()
    // Two synchronous events model requests that start before React commits the loading state.
    await retry.evaluate((button: HTMLButtonElement) => { button.click(); button.click() })
    await expect.poll(() => oldStarted && requests === 3).toBe(true)
    await expect(page.getByRole('button', { name: /New category/, expanded: false })).toBeVisible()
    const old = page.waitForResponse(response => response.url().includes('/services/admin/categories'))
    release()
    await old
    await expect(page.getByRole('button', { name: /New category/, expanded: false })).toBeVisible()
    await expect(page.getByRole('button', { name: /Old category/, expanded: false })).toHaveCount(0)
    await expect(page.locator('[data-admin-state="error"]')).toHaveCount(0)
  })
}
