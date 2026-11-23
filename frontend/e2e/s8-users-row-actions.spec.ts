import { expect, test, type Page } from '@playwright/test'

type Write = { method: string; path: string; body: unknown }
const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const user = { id: 'client-1', username: 'sample.client', email: 'sample@example.test', firstName: 'Sample', lastName: 'Client', phone: '123456', gender: 'FEMALE', avatar: null, isActive: true, isEmailVerified: true, mustChangePassword: true, createdAt: '2026-01-01T00:00:00Z', userRoles: [{ role: { name: 'CLIENT' } }, { role: { name: 'OWNER' } }] }
const unverified = { ...user, id: 'client-2', username: 'unverified', email: 'unverified@example.test', isEmailVerified: false, userRoles: [{ role: { name: 'CLIENT' } }] }
async function setup(page: Page, writes: Write[]) {
  await page.addInitScript(() => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', 'en') })
  await page.route(/\/(api|auth)\//, async route => {
    const req = route.request(), path = new URL(req.url()).pathname
    if (req.method() !== 'GET') { writes.push({ method: req.method(), path, body: req.postData() ? req.postDataJSON() : null }); return route.fulfill({ json: {} }) }
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    if (path === '/api/users/profile') return route.fulfill({ json: profile })
    if (path === '/api/users/clients/admin') return route.fulfill({ json: { items: [user, unverified], total: 2, page: 0, pageSize: 20 } })
    if (path === '/api/users/password-reset-candidates') return route.fulfill({ json: [{ id: 'client-1' }, { id: 'client-2' }] })
    if (path === '/api/users/system-admins' || path === '/api/users/stylists' || path === '/api/client-debts') return route.fulfill({ json: [] })
    return route.fulfill({ json: {} })
  })
  await page.goto('/admin/users', { waitUntil: 'networkidle' })
}

for (const width of [320, 1280]) {
  test(`row actions preserve role, reset and deactivation contracts ${width}`, async ({ page }) => {
    const writes: Write[] = []
    await page.setViewportSize({ width, height: 800 })
    await setup(page, writes)
    const root = page.locator('[data-admin-users]')
    await expect(root.getByRole('button', { name: 'Send password reset link to unverified' })).toBeDisabled()
    const roleButton = root.getByRole('button', { name: 'Add role to sample.client' })
    await roleButton.click()
    await page.getByRole('menuitem', { name: 'Stylist', exact: true }).click()
    await expect.poll(() => writes.length).toBe(1)
    expect(writes[0]).toEqual({ method: 'POST', path: '/api/users/client-1/roles', body: { role: 'STYLIST' } })
    const remove = root.getByRole('button', { name: 'Remove Owner role from sample.client' })
    await remove.click()
    let dialog = page.getByRole('dialog', { name: 'Confirmation' })
    await expect(dialog).toContainText('Remove the Owner role?')
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(remove).toBeFocused()
    expect(writes).toHaveLength(1)
    await remove.click()
    await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
    await expect.poll(() => writes.length).toBe(2)
    expect(writes[1]).toEqual({ method: 'DELETE', path: '/api/users/client-1/roles/OWNER', body: null })
    const reset = root.getByRole('button', { name: 'Send password reset link to sample.client' })
    await reset.click()
    dialog = page.getByRole('dialog', { name: 'Confirmation' })
    await expect(dialog).toContainText('sample@example.test')
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(reset).toBeFocused()
    expect(writes).toHaveLength(2)
    await reset.click()
    await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
    await expect.poll(() => writes.length).toBe(3)
    expect(writes[2]).toEqual({ method: 'POST', path: '/auth/admin/users/client-1/password-reset-link', body: null })
    const deactivate = root.getByRole('button', { name: 'Deactivate user sample.client' })
    await deactivate.click()
    dialog = page.getByRole('dialog', { name: 'Confirmation' })
    await expect(dialog).toContainText('sample.client')
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(deactivate).toBeFocused()
    expect(writes).toHaveLength(3)
    await deactivate.click()
    await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
    await expect.poll(() => writes.length).toBe(4)
    expect(writes[3]).toEqual({ method: 'PATCH', path: '/api/users/client-1', body: { isActive: false } })
  })

  test(`row analytics deep link retains selected user ${width}`, async ({ page }) => {
    const writes: Write[] = []
    await page.setViewportSize({ width, height: 800 })
    await setup(page, writes)
    await page.getByRole('button', { name: 'Client analytics for sample.client' }).click()
    await expect(page).toHaveURL(/\/admin\/analytics\?tab=clients&userId=client-1/)
    expect(writes).toHaveLength(0)
  })
}
