import { expect, test } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const stylist = (n: number) => ({ id: `stylist-${n}`, userId: `user-${n}`, specialization: 'Cut', status: 'ACTIVE', isActive: true, hireDate: null, user: { username: `hair.${n}`, firstName: 'Hair', lastName: String(n), email: null } })

for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`stylist pagination keeps focus on an available heading ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
      let release!: () => void, started = false
      const gate = new Promise<void>(resolve => { release = resolve })
      const requests: number[] = []
      await page.route('**/api/**', async route => {
        const url = new URL(route.request().url())
        if (url.pathname === '/api/settings/public') return route.fulfill({ json: [] })
        if (url.pathname === '/api/users/profile') return route.fulfill({ json: profile })
        if (url.pathname === '/api/stylists/admin') {
          const n = Number(url.searchParams.get('page'))
          requests.push(n)
          if (n === 1) { started = true; await gate }
          return route.fulfill({ json: { items: n === 0 ? Array.from({ length: 20 }, (_, i) => stylist(i + 1)) : [stylist(21)], total: 21, page: n, pageSize: 20 } })
        }
        return route.fulfill({ json: {} })
      })
      try {
        await page.goto('/admin/stylists', { waitUntil: 'networkidle' })
        const heading = page.getByRole('heading', { level: 1 })
        const next = page.getByRole('button', { name: language === 'bs' ? 'Sljedeća' : 'Next' })
        const previous = page.getByRole('button', { name: language === 'bs' ? 'Prethodna' : 'Previous' })
        await expect(previous).toBeDisabled()
        await expect(next).toBeEnabled()
        await next.focus(); await page.keyboard.press('Enter')
        await expect.poll(() => started).toBe(true)
        await expect(page.getByRole('status').filter({ hasText: language === 'bs' ? /Učitavanje/ : /Loading/ })).toBeVisible()
        await expect(heading).toBeFocused()
        release()
        await expect(page.getByRole('row').filter({ hasText: 'hair.21' })).toBeVisible()
        await expect(heading).toBeFocused()
        await expect(previous).toBeEnabled()
        await expect(next).toBeDisabled()
        await expect(page.getByText('2 / 2', { exact: true })).toBeVisible()
        expect(requests).toEqual([0, 1])
        await previous.focus(); await page.keyboard.press('Enter')
        await expect(page.getByRole('row').filter({ hasText: /\(hair\.1\)/ })).toBeVisible()
        await expect(heading).toBeFocused()
        expect(requests).toEqual([0, 1, 0])
      } finally { release() }
    })
  }
}

test('stylist pagination does not steal focus moved during a pending read', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', 'en') })
  let release!: () => void, started = false
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/settings/public') return route.fulfill({ json: [] })
    if (url.pathname === '/api/users/profile') return route.fulfill({ json: profile })
    if (url.pathname === '/api/stylists/admin') {
      const n = Number(url.searchParams.get('page'))
      if (n === 1) { started = true; await gate }
      return route.fulfill({ json: { items: [stylist(n + 1)], total: 21, page: n, pageSize: 20 } })
    }
    return route.fulfill({ json: {} })
  })
  try {
    await page.goto('/admin/stylists', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Next' }).click()
    await expect.poll(() => started).toBe(true)
    const other = page.getByRole('link', { name: 'Services', exact: true })
    await other.focus()
    const response = page.waitForResponse(r => r.url().includes('/api/stylists/admin') && new URL(r.url()).searchParams.get('page') === '1')
    release(); await response
    await expect(page.getByRole('row').filter({ hasText: 'hair.2' })).toBeVisible()
    await expect(other).toBeFocused()
  } finally { release() }
})

test('a failed page can be retried without losing the requested page or focus', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', 'en') })
  const requests: number[] = []
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/settings/public') return route.fulfill({ json: [] })
    if (url.pathname === '/api/users/profile') return route.fulfill({ json: profile })
    if (url.pathname === '/api/stylists/admin') {
      const n = Number(url.searchParams.get('page'))
      requests.push(n)
      if (n === 1 && requests.filter(p => p === 1).length === 1) return route.fulfill({ status: 500, json: {} })
      return route.fulfill({ json: { items: [stylist(n + 1)], total: 21, page: n, pageSize: 20 } })
    }
    return route.fulfill({ json: {} })
  })
  await page.goto('/admin/stylists', { waitUntil: 'networkidle' })
  const heading = page.getByRole('heading', { level: 1 })
  await page.getByRole('button', { name: 'Next' }).click()
  const retry = page.getByRole('alert').getByRole('button', { name: 'Try again' })
  await expect(retry).toBeVisible()
  await expect(heading).toBeFocused()
  await retry.focus(); await page.keyboard.press('Enter')
  await expect(page.getByRole('row').filter({ hasText: 'hair.2' })).toBeVisible()
  await expect(heading).toBeFocused()
  await expect(page.getByText('2 / 2', { exact: true })).toBeVisible()
  expect(requests).toEqual([0, 1, 1])
})
