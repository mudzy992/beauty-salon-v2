import { expect, test } from '@playwright/test'

for (const width of [320, 1280]) {
  test(`user pagination keeps API page and search reset ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await page.addInitScript(() => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', 'en') })
    const queries: Array<{ page: number; pageSize: number; q: string }> = []
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()), path = url.pathname
      if (path === '/api/settings/public') return route.fulfill({ json: [] })
      if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
      if (path === '/api/users/clients/admin') {
        const query = { page: Number(url.searchParams.get('page')), pageSize: Number(url.searchParams.get('pageSize')), q: url.searchParams.get('q') ?? '' }
        queries.push(query)
        return route.fulfill({ json: { items: [], total: query.q ? 1 : 201, page: query.page, pageSize: query.pageSize } })
      }
      if (path === '/api/users/system-admins' || path === '/api/users/stylists' || path === '/api/users/password-reset-candidates') return route.fulfill({ json: [] })
      return route.fulfill({ json: {} })
    })
    await page.goto('/admin/users', { waitUntil: 'networkidle' })
    const root = page.locator('[data-admin-users]')
    await expect(root.getByRole('button', { name: 'Previous' })).toBeDisabled()
    await expect(root.getByRole('button', { name: '1', exact: true })).toHaveAttribute('aria-current', 'page')
    await root.getByRole('button', { name: '11', exact: true }).click()
    await expect(root.getByRole('button', { name: '11', exact: true })).toHaveAttribute('aria-current', 'page')
    await expect(root.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(queries).toContainEqual({ page: 10, pageSize: 20, q: '' })
    await root.getByRole('button', { name: 'Previous' }).click()
    await expect(root.getByRole('button', { name: '10', exact: true })).toHaveAttribute('aria-current', 'page')
    await root.getByRole('textbox', { name: 'Search clients' }).fill('  Sam  ')
    await expect.poll(() => queries.some(query => query.page === 0 && query.q === 'Sam' && query.pageSize === 20)).toBe(true)
    await expect(root.getByRole('button', { name: '1', exact: true })).toHaveAttribute('aria-current', 'page')
    await expect(root.getByRole('button', { name: 'Previous' })).toBeDisabled()
    await expect(root.getByRole('button', { name: 'Next' })).toBeDisabled()
    await root.getByRole('tab', { name: /Administrators/ }).click()
    await expect(root.getByRole('button', { name: 'Previous' })).toHaveCount(0)
  })
}
