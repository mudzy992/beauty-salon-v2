import { expect, test } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const salon = { id: 'salon-1', name: 'Recovered salon', workingHours: [{ dayOfWeek: 1, openTime: '09:00', closeTime: '17:00', isWorkingDay: true }], holidays: [] }

for (const lang of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`salon loading preserves heading and announces status ${lang} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.addInitScript(language => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', language) }, lang)
      let release!: () => void, started = false
      const gate = new Promise<void>(resolve => { release = resolve })
      await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname
        if (path === '/api/settings/public') return route.fulfill({ json: [] })
        if (path === '/api/users/profile') return route.fulfill({ json: profile })
        if (path === '/api/salon/list') { started = true; await gate; return route.fulfill({ json: [salon] }) }
        return route.fulfill({ json: {} })
      })
      try {
        await page.goto('/admin/salon', { waitUntil: 'domcontentloaded' })
        await expect.poll(() => started).toBe(true)
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
        await expect(page.getByRole('status').filter({ hasText: lang === 'en' ? 'Loading' : 'Učitavanje' })).toBeVisible()
      } finally { release() }
      await expect(page.locator('#salon-salon-salon-name-2')).toHaveValue('Recovered salon')
    })

    for (const failure of ['fallback', 'detail', 'malformed-list', 'missing-hours', 'invalid-hours'] as const) {
      test(`salon ${failure} failure is not mistaken for no salon ${lang} ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 })
        await page.addInitScript(language => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', language) }, lang)
        let attempts = 0
        const writes: string[] = []
        await page.route('**/api/**', async route => {
          const path = new URL(route.request().url()).pathname
          if (route.request().method() !== 'GET') { writes.push(path); return route.fulfill({ json: {} }) }
          if (path === '/api/settings/public') return route.fulfill({ json: [] })
          if (path === '/api/users/profile') return route.fulfill({ json: profile })
          if (path === '/api/salon/list') {
            attempts++
            if (attempts > 1) return route.fulfill({ json: [salon] })
            if (failure === 'malformed-list') return route.fulfill({ json: {} })
            if (failure === 'missing-hours') return route.fulfill({ json: [{ id: salon.id, name: salon.name, holidays: [] }] })
            if (failure === 'invalid-hours') return route.fulfill({ json: [{ ...salon, workingHours: [{ dayOfWeek: 9 }] }] })
            return route.fulfill({ status: 500, json: {} })
          }
          if (path === '/api/salon') return failure === 'fallback' ? route.fulfill({ status: 500, json: {} }) : route.fulfill({ json: { id: 'salon-1' } })
          if (path === '/api/salon/salon-1') return route.fulfill({ status: 500, json: {} })
          return route.fulfill({ json: {} })
        })
        await page.goto('/admin/salon', { waitUntil: 'networkidle' })
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
        const alert = page.getByRole('alert').filter({ has: page.getByRole('button', { name: lang === 'en' ? 'Try again' : 'Pokušaj ponovo' }) })
        await expect(alert).toBeVisible()
        await expect(page.locator('#salon-salon-name')).toHaveCount(0)
        expect(writes).toEqual([])
        await alert.getByRole('button').click()
        await expect(page.locator('#salon-salon-salon-name-2')).toHaveValue('Recovered salon')
        expect(attempts).toBe(2)
        expect(writes).toEqual([])
      })
    }
  }
}

test('failed salon list with successful null fallback remains a real empty state', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', 'en') })
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    if (path === '/api/users/profile') return route.fulfill({ json: profile })
    if (path === '/api/salon/list') return route.fulfill({ status: 500, json: {} })
    if (path === '/api/salon') return route.fulfill({ json: null })
    return route.fulfill({ json: {} })
  })
  await page.goto('/admin/salon', { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Create salon' })).toBeVisible()
})

for (const status of [200, 500]) {
  test(`stale salon retry ${status} cannot replace the latest result or trigger fallback`, async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', 'en') })
    let release!: () => void, started = false, listRequests = 0, fallbackRequests = 0
    const gate = new Promise<void>(resolve => { release = resolve })
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/settings/public') return route.fulfill({ json: [] })
      if (path === '/api/users/profile') return route.fulfill({ json: profile })
      if (path === '/api/salon/list') {
        listRequests++
        if (listRequests === 1) return route.fulfill({ status: 500, json: {} })
        if (listRequests === 2) { started = true; await gate; return status === 200 ? route.fulfill({ json: [{ ...salon, name: 'Stale salon' }] }) : route.fulfill({ status: 500, json: {} }) }
        return route.fulfill({ json: [salon] })
      }
      if (path === '/api/salon') { fallbackRequests++; return route.fulfill({ status: 500, json: {} }) }
      return route.fulfill({ json: {} })
    })
    try {
      await page.goto('/admin/salon', { waitUntil: 'networkidle' })
      const retry = page.getByRole('alert').getByRole('button', { name: 'Try again' })
      await expect(retry).toBeVisible()
      await retry.evaluate((button: HTMLButtonElement) => { button.click(); button.click() })
      await expect.poll(() => started && listRequests === 3).toBe(true)
      await expect(page.locator('#salon-salon-salon-name-2')).toHaveValue('Recovered salon')
      const old = page.waitForResponse(r => r.url().includes('/api/salon/list'))
      release()
      await old
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
      await expect(page.locator('#salon-salon-salon-name-2')).toHaveValue('Recovered salon')
      await expect(page.getByRole('alert').getByRole('button', { name: 'Try again' })).toHaveCount(0)
      expect(fallbackRequests).toBe(1)
    } finally { release() }
  })
}
