import { expect, test, type Page, type Route } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const client = (username: string) => ({ id: username, username, email: `${username}@example.test`, firstName: username, lastName: 'Fixture', phone: null, gender: 'FEMALE', avatar: null, isActive: true, isEmailVerified: true, userRoles: [{ role: { name: 'CLIENT' } }] })
const result = (username: string) => ({ items: [client(username)], total: 1, page: 0, pageSize: 20 })
async function setup(page: Page, handler: (route: Route, url: URL) => Promise<void>) {
  await page.addInitScript(() => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', 'en') })
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/settings/public') return route.fulfill({ json: [] })
    if (url.pathname === '/api/users/profile') return route.fulfill({ json: profile })
    if (url.pathname === '/api/users/system-admins' || url.pathname === '/api/users/stylists' || url.pathname === '/api/users/password-reset-candidates') return route.fulfill({ json: [] })
    return handler(route, url)
  })
}

for (const oldStatus of [200, 500]) {
  test(`stale user-list response ${oldStatus} cannot replace newer search`, async ({ page }) => {
    let release!: () => void
    const oldGate = new Promise<void>(resolve => { release = resolve })
    let oldStarted = false
    await setup(page, async (route, url) => {
      if (url.pathname !== '/api/users/clients/admin') return route.fulfill({ json: {} })
      const q = url.searchParams.get('q')
      if (q === 'old') {
        oldStarted = true
        await oldGate
        return oldStatus === 200 ? route.fulfill({ json: result('old-result') }) : route.fulfill({ status: 500, json: {} })
      }
      return route.fulfill({ json: result(q === 'new' ? 'new-result' : 'initial') })
    })
    await page.goto('/admin/users', { waitUntil: 'networkidle' })
    const root = page.locator('[data-admin-users]'), search = root.getByRole('textbox', { name: 'Search clients' })
    await search.fill('old')
    await expect.poll(() => oldStarted).toBe(true)
    await search.fill('new')
    await expect(root.getByRole('button', { name: 'Edit user new-result' })).toBeVisible()
    const oldResponse = page.waitForResponse(response => new URL(response.url()).searchParams.get('q') === 'old')
    release()
    await oldResponse
    await expect(root.getByRole('button', { name: 'Edit user new-result' })).toBeVisible()
    await expect(root.getByRole('button', { name: 'Edit user old-result' })).toHaveCount(0)
    await expect(root.getByText('Could not load users. Please try again.')).toHaveCount(0)
  })
}

test('stale completion cannot clear loading for a newer pending user search', async ({ page }) => {
  let releaseOld!: () => void, releaseNew!: () => void
  const oldGate = new Promise<void>(resolve => { releaseOld = resolve })
  const newGate = new Promise<void>(resolve => { releaseNew = resolve })
  let oldStarted = false, newStarted = false
  await setup(page, async (route, url) => {
    if (url.pathname !== '/api/users/clients/admin') return route.fulfill({ json: {} })
    const q = url.searchParams.get('q')
    if (q === 'old') { oldStarted = true; await oldGate; return route.fulfill({ json: result('old-result') }) }
    if (q === 'new') { newStarted = true; await newGate; return route.fulfill({ json: result('new-result') }) }
    return route.fulfill({ json: result('initial') })
  })
  await page.goto('/admin/users', { waitUntil: 'networkidle' })
  const root = page.locator('[data-admin-users]'), search = root.getByRole('textbox', { name: 'Search clients' })
  await search.fill('old')
  await expect.poll(() => oldStarted).toBe(true)
  await search.fill('new')
  await expect.poll(() => newStarted).toBe(true)
  const oldResponse = page.waitForResponse(response => new URL(response.url()).searchParams.get('q') === 'old')
  releaseOld()
  await oldResponse
  await expect(root.getByRole('status').filter({ hasText: 'Loading' })).toBeVisible()
  await expect(root.getByRole('button', { name: 'Edit user old-result' })).toHaveCount(0)
  releaseNew()
  await expect(root.getByRole('button', { name: 'Edit user new-result' })).toBeVisible()
})

test('user-list read failure exposes retry and recovers', async ({ page }) => {
  let attempts = 0
  await setup(page, async (route, url) => {
    if (url.pathname !== '/api/users/clients/admin') return route.fulfill({ json: {} })
    attempts += 1
    return attempts === 1 ? route.fulfill({ status: 500, json: {} }) : route.fulfill({ json: result('recovered') })
  })
  await page.goto('/admin/users', { waitUntil: 'networkidle' })
  const root = page.locator('[data-admin-users]')
  const alert = root.getByRole('alert')
  await expect(alert).toContainText('Could not load users. Please try again.')
  await alert.getByRole('button').click()
  await expect(root.getByRole('button', { name: 'Edit user recovered' })).toBeVisible()
  await expect(alert).toHaveCount(0)
  expect(attempts).toBe(2)
})
