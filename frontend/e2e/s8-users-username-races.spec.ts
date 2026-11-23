import { expect, test } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const client = { id: 'client-1', username: 'sample.client', email: 'sample@example.test', firstName: 'Sample', lastName: 'Client', phone: null, gender: 'FEMALE', avatar: null, isActive: true, isEmailVerified: true, createdAt: '2026-01-01T00:00:00Z', userRoles: [{ role: { name: 'CLIENT' } }] }

for (const mode of ['create', 'edit'] as const) {
  for (const status of [200, 500]) {
    test(`${mode} username availability ignores older ${status} response`, async ({ page }) => {
      await page.addInitScript(() => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', 'en') })
      let release!: () => void, oldStarted = false
      const gate = new Promise<void>(resolve => { release = resolve })
      await page.route('**/api/**', async route => {
        const url = new URL(route.request().url()), path = url.pathname
        if (path === '/api/settings/public') return route.fulfill({ json: [] })
        if (path === '/api/users/profile') return route.fulfill({ json: profile })
        if (path === '/api/users/clients/admin') return route.fulfill({ json: { items: [client], total: 1, page: 0, pageSize: 20 } })
        if (path === '/api/client-debts' || path === '/api/users/system-admins' || path === '/api/users/stylists' || path === '/api/users/password-reset-candidates') return route.fulfill({ json: [] })
        if (path.endsWith('/username-availability')) {
          const username = url.searchParams.get('username')
          if (username === 'old.name') {
            oldStarted = true
            await gate
            return route.fulfill(status === 200 ? { json: { available: false, suggestions: ['old.suggestion'] } } : { status: 500, json: {} })
          }
          return route.fulfill({ json: { available: true, suggestions: [] } })
        }
        return route.fulfill({ json: {} })
      })
      await page.goto('/admin/users', { waitUntil: 'networkidle' })
      const root = page.locator('[data-admin-users]')
      await root.getByRole('button', { name: mode === 'create' ? 'New user' : 'Edit user sample.client', exact: true }).click()
      const dialog = page.getByRole('dialog')
      const field = dialog.locator(mode === 'create' ? '#users-users-username-2' : '#users-username')
      await field.fill('old.name')
      await expect.poll(() => oldStarted).toBe(true)
      await field.fill('new.name')
      await expect(dialog.getByText('This username is available.', { exact: true })).toBeVisible()
      const old = page.waitForResponse(response => response.url().includes('/username-availability') && new URL(response.url()).searchParams.get('username') === 'old.name')
      release()
      await old
      await expect(dialog.getByText('This username is available.', { exact: true })).toBeVisible()
      await expect(dialog.getByText('This username is unavailable.', { exact: true })).toHaveCount(0)
      await expect(dialog.getByText('old.suggestion', { exact: true })).toHaveCount(0)
    })
  }
}
