import { expect, test } from '@playwright/test'

for (const width of [320, 1280]) {
  test(`users list composition preserves cards, table, tabs and edit focus at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await page.addInitScript(() => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', 'en') })
    const client = { id: 'client-1', username: 'sample.client', email: 'sample@example.test', firstName: 'Sample', lastName: 'Client', phone: '123456', gender: 'FEMALE', avatar: null, isActive: true, isEmailVerified: true, createdAt: '2026-01-01T00:00:00Z', userRoles: [{ role: { name: 'CLIENT' } }] }
    const writes: string[] = []
    await page.route('**/api/**', async route => {
      const req = route.request(), path = new URL(req.url()).pathname
      if (req.method() !== 'GET') { writes.push(path); return route.abort() }
      if (path === '/api/settings/public') return route.fulfill({ json: [] })
      if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
      if (path === '/api/users/clients/admin') return route.fulfill({ json: { items: [client], total: 1, page: 0, pageSize: 20 } })
      if (path === '/api/users/system-admins' || path === '/api/users/stylists' || path === '/api/users/password-reset-candidates' || path === '/api/client-debts') return route.fulfill({ json: [] })
      return route.fulfill({ json: {} })
    })
    await page.goto('/admin/users', { waitUntil: 'networkidle' })
    const root = page.locator('[data-admin-users]')
    const edit = root.getByRole('button', { name: 'Edit user sample.client', exact: true })
    await expect(edit).toBeVisible()
    await expect(root.locator('span:visible').filter({ hasText: /^sample@example\.test$/ })).toBeVisible()
    if (width >= 1024) {
      const table = root.getByRole('table', { name: /Users table:/ })
      await expect(table).toBeVisible()
      await expect(table.getByRole('columnheader')).toHaveCount(8)
    } else {
      await expect(root.getByRole('table')).toBeHidden()
    }
    await edit.click()
    const dialog = page.locator('[data-users-dialog][role="dialog"]')
    await expect(dialog).toContainText('sample.client')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(edit).toBeFocused()
    await root.getByRole('tab', { name: /Administrators/ }).click()
    await expect(root.getByText('No data.', { exact: true })).toBeVisible()
    await root.getByRole('tab', { name: /Clients/ }).click()
    await expect(edit).toBeVisible()
    expect(writes).toEqual([])
  })
}
