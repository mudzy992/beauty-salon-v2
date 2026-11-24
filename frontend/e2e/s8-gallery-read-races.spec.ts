import { expect, test, type Page, type Route } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const pair = (id: string) => ({ id, before: { pathOriginal: `/brand/${id}-before.jpg` }, after: { pathOriginal: `/brand/${id}-after.jpg` } })
async function setup(page: Page, lang: string, handler: (route: Route, url: URL) => Promise<void>) {
  await page.addInitScript(language => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', language) }, lang)
  await page.route('**/uploads/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>' }))
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/settings/public') return route.fulfill({ json: [] })
    if (url.pathname === '/api/users/profile') return route.fulfill({ json: profile })
    return handler(route, url)
  })
}

for (const kind of ['service', 'pairs'] as const) {
  for (const status of [200, 500]) {
    test(`gallery ignores stale ${kind} ${status} after changing service`, async ({ page }) => {
      let release!: () => void, started = false
      const gate = new Promise<void>(resolve => { release = resolve })
      await setup(page, 'en', async (route, url) => {
        const oldService = url.pathname === '/api/services/admin/services/svc-a'
        const oldPairs = url.pathname === '/api/daily-log/before-after' && url.searchParams.get('serviceId') === 'svc-a'
        if ((kind === 'service' && oldService) || (kind === 'pairs' && oldPairs)) {
          started = true; await gate
          if (status === 500) return route.fulfill({ status: 500, json: {} })
          return route.fulfill({ json: oldService ? { id: 'svc-a', name: 'Service A', durationMinutes: 30 } : { items: [pair('pair-a')], hasMore: false, nextOffset: 1 } })
        }
        if (oldService) return route.fulfill({ json: { id: 'svc-a', name: 'Service A', durationMinutes: 30 } })
        if (url.pathname === '/api/services/admin/services/svc-b') return route.fulfill({ json: { id: 'svc-b', name: 'Service B', durationMinutes: 60 } })
        if (url.pathname === '/api/daily-log/before-after') return route.fulfill({ json: { items: [pair(oldPairs ? 'pair-a' : 'pair-b')], hasMore: false, nextOffset: 1 } })
        return route.fulfill({ json: {} })
      })
      try {
        await page.goto('/admin/services/svc-a/work-gallery', { waitUntil: 'domcontentloaded' })
        await expect.poll(() => started).toBe(true)
        await page.evaluate(() => { history.pushState(null, '', '/admin/services/svc-b/work-gallery'); window.dispatchEvent(new PopStateEvent('popstate')) })
        await expect(page.getByText('Service B', { exact: true })).toBeVisible()
        await expect(page.locator('img[src*="pair-b-before.jpg"]')).toHaveCount(1)
        const response = page.waitForResponse(r => kind === 'service' ? r.url().includes('/services/svc-a') : new URL(r.url()).searchParams.get('serviceId') === 'svc-a')
        release()
        await response
        await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
        await expect(page.getByText('Service B', { exact: true })).toBeVisible()
        await expect(page.locator('img[src*="pair-b-before.jpg"]')).toHaveCount(1)
        await expect(page.locator('img[src*="pair-a-before.jpg"]')).toHaveCount(0)
        await expect(page.getByRole('alert')).toHaveCount(0)
      } finally { release() }
    })
  }
}

for (const lang of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`gallery malformed pair response is recoverable ${lang} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      let attempts = 0
      await setup(page, lang, async (route, url) => {
        if (url.pathname === '/api/services/admin/services/svc-b') return route.fulfill({ json: { id: 'svc-b', name: 'Service B', durationMinutes: 60 } })
        if (url.pathname === '/api/daily-log/before-after') { attempts++; return route.fulfill({ json: attempts === 1 ? { items: null, hasMore: false, nextOffset: 0 } : { items: [pair('pair-b')], hasMore: false, nextOffset: 1 } }) }
        return route.fulfill({ json: {} })
      })
      await page.goto('/admin/services/svc-b/work-gallery', { waitUntil: 'networkidle' })
      const alert = page.getByRole('alert')
      await expect(alert).toBeVisible()
      await alert.getByRole('button', { name: lang === 'en' ? 'Try again' : 'Pokušaj ponovo' }).click()
      await expect(page.locator('img[src*="pair-b-before.jpg"]')).toHaveCount(1)
      expect(attempts).toBe(2)
    })
  }
}

test('gallery retries a malformed later page without losing earlier images', async ({ page }) => {
  let laterAttempts = 0
  await setup(page, 'en', async (route, url) => {
    if (url.pathname === '/api/services/admin/services/svc-b') return route.fulfill({ json: { id: 'svc-b', name: 'Service B', durationMinutes: 60 } })
    if (url.pathname === '/api/daily-log/before-after') {
      if (url.searchParams.get('offset') === '0') return route.fulfill({ json: { items: [pair('first')], hasMore: true, nextOffset: 1 } })
      laterAttempts++
      return route.fulfill({ json: laterAttempts === 1 ? { items: [ { id: 'broken', before: null, after: {} } ], hasMore: false, nextOffset: 2 } : { items: [pair('second')], hasMore: false, nextOffset: 2 } })
    }
    return route.fulfill({ json: {} })
  })
  await page.goto('/admin/services/svc-b/work-gallery', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.locator('img[src*="first-before.jpg"]')).toHaveCount(1)
  await page.getByRole('alert').getByRole('button', { name: 'Try again' }).click()
  await expect(page.locator('img[src*="second-before.jpg"]')).toHaveCount(1)
  await expect(page.locator('img[src*="first-before.jpg"]')).toHaveCount(1)
  expect(laterAttempts).toBe(2)
})

test('gallery ignores a stale later page after changing service', async ({ page }) => {
  let release!: () => void, started = false
  const gate = new Promise<void>(resolve => { release = resolve })
  await setup(page, 'en', async (route, url) => {
    if (url.pathname.startsWith('/api/services/admin/services/')) {
      const id = url.pathname.endsWith('svc-a') ? 'svc-a' : 'svc-b'
      return route.fulfill({ json: { id, name: id === 'svc-a' ? 'Service A' : 'Service B', durationMinutes: 30 } })
    }
    if (url.pathname === '/api/daily-log/before-after') {
      const isA = url.searchParams.get('serviceId') === 'svc-a'
      if (isA && url.searchParams.get('offset') !== '0') { started = true; await gate; return route.fulfill({ json: { items: [pair('old-later')], hasMore: false, nextOffset: 2 } }) }
      return route.fulfill({ json: { items: [pair(isA ? 'old-first' : 'new-first')], hasMore: isA, nextOffset: 1 } })
    }
    return route.fulfill({ json: {} })
  })
  try {
    await page.goto('/admin/services/svc-a/work-gallery', { waitUntil: 'domcontentloaded' })
    await expect.poll(() => started).toBe(true)
    await page.evaluate(() => { history.pushState(null, '', '/admin/services/svc-b/work-gallery'); window.dispatchEvent(new PopStateEvent('popstate')) })
    await expect(page.locator('img[src*="new-first-before.jpg"]')).toHaveCount(1)
    const response = page.waitForResponse(r => new URL(r.url()).searchParams.get('serviceId') === 'svc-a' && new URL(r.url()).searchParams.get('offset') === '1')
    release(); await response
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    await expect(page.locator('img[src*="old-later-before.jpg"]')).toHaveCount(0)
    await expect(page.locator('img[src*="old-first-before.jpg"]')).toHaveCount(0)
    await expect(page.locator('img[src*="new-first-before.jpg"]')).toHaveCount(1)
  } finally { release() }
})
