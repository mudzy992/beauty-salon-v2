import { expect, test, type Page, type Route } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const client = { id: 'client-1', username: 'sample.client', email: 'sample@example.test', firstName: 'Sample', lastName: 'Client', phone: null, gender: 'FEMALE', avatar: null, isActive: true, isEmailVerified: true, createdAt: '2026-01-01T00:00:00Z', userRoles: [{ role: { name: 'CLIENT' } }] }
async function setup(page: Page, handler: (route: Route, path: string) => Promise<void>) {
  await page.addInitScript(() => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', 'en') })
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    if (path === '/api/users/profile') return route.fulfill({ json: profile })
    if (path === '/api/users/clients/admin') return route.fulfill({ json: { items: [client], total: 1, page: 0, pageSize: 20 } })
    if (path === '/api/users/system-admins' || path === '/api/users/stylists' || path === '/api/users/password-reset-candidates') return route.fulfill({ json: [] })
    if (path.endsWith('/username-availability')) return route.fulfill({ json: { available: true, suggestions: [] } })
    return handler(route, path)
  })
}

for (const width of [320, 1280]) {
  test(`user creation retry and missing server password ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    const bodies: unknown[] = []
    await setup(page, async (route, path) => {
      if (path === '/api/users' && route.request().method() === 'POST') {
        bodies.push(route.request().postDataJSON())
        return route.fulfill(bodies.length === 1 ? { status: 500, json: {} } : { json: { username: 'new.user' } })
      }
      return route.fulfill({ json: {} })
    })
    await page.goto('/admin/users', { waitUntil: 'networkidle' })
    const create = page.getByRole('button', { name: 'New user', exact: true })
    await create.click()
    const dialog = page.getByRole('dialog')
    await dialog.locator('#users-auth-first-name-2').fill('New')
    await dialog.locator('#users-auth-last-name-2').fill('User')
    await dialog.locator('#users-create-gender').selectOption('FEMALE')
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('Could not create the user.')).toBeVisible()
    await expect(dialog.locator('#users-auth-first-name-2')).toHaveValue('New')
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText(/one-time password was not returned/i)).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'User sign-in details (shown once)' })).toHaveCount(0)
    await expect(create).toBeFocused()
    expect(bodies).toEqual([
      { username: 'new.user', firstName: 'New', lastName: 'User', role: 'CLIENT', gender: 'FEMALE' },
      { username: 'new.user', firstName: 'New', lastName: 'User', role: 'CLIENT', gender: 'FEMALE' },
    ])
  })

  test(`client debt write-off reason, failure retry and scoped invalidation ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    let written = false, reads = 0
    const writes: unknown[] = []
    await setup(page, async (route, path) => {
      if (path === '/api/client-debts') {
        reads++
        expect(new URL(route.request().url()).searchParams.get('clientId')).toBe('client-1')
        return route.fulfill({ json: written ? [] : [{ id: 'debt-1', amount: 25, createdAt: '2026-01-01T00:00:00Z', service: { id: 's1', name: 'Fixture debt service' } }] })
      }
      if (path === '/api/client-debts/debt-1/write-off') {
        expect(route.request().method()).toBe('PATCH')
        writes.push(route.request().postDataJSON())
        if (writes.length === 1) return route.fulfill({ status: 500, json: {} })
        written = true
        return route.fulfill({ json: {} })
      }
      return route.fulfill({ json: {} })
    })
    await page.goto('/admin/users', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Edit user sample.client', exact: true }).click()
    const edit = page.getByRole('dialog', { name: /edit user/i })
    await expect(edit.getByText('Fixture debt service')).toBeVisible()
    await edit.getByRole('button', { name: 'Write off debt' }).click()
    const confirm = page.getByRole('dialog', { name: 'Write off debt' })
    const submit = confirm.getByRole('button', { name: 'Write off debt' })
    await expect(submit).toBeDisabled()
    await confirm.getByLabel('Reason for write-off').fill('  test reason  ')
    await submit.click()
    await expect(page.getByText('Could not write off the debt.')).toBeVisible()
    await expect(confirm).toBeVisible()
    await expect(submit).toBeEnabled()
    await submit.click()
    await expect(confirm).toBeHidden()
    await expect(edit.getByText('No open debts.')).toBeVisible()
    expect(reads).toBeGreaterThanOrEqual(2)
    expect(writes).toEqual([{ note: 'test reason' }, { note: 'test reason' }])
  })
}
