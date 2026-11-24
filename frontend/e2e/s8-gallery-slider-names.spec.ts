import { expect, test } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const pair = (id: string) => ({ id, before: { pathOriginal: `/brand/${id}-before.jpg` }, after: { pathOriginal: `/brand/${id}-after.jpg` } })

for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`gallery sliders have distinct names and independent keyboard controls ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
      await page.route('**/uploads/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>' }))
      await page.route('**/api/**', route => {
        const url = new URL(route.request().url())
        if (url.pathname === '/api/settings/public') return route.fulfill({ json: [] })
        if (url.pathname === '/api/users/profile') return route.fulfill({ json: profile })
        if (url.pathname === '/api/services/admin/services/svc-1') return route.fulfill({ json: { id: 'svc-1', name: 'Fixture service', durationMinutes: 30 } })
        if (url.pathname === '/api/daily-log/before-after') return route.fulfill({ json: { items: [pair('first'), pair('second')], hasMore: false, nextOffset: 2 } })
        return route.fulfill({ json: {} })
      })
      await page.goto('/admin/services/svc-1/work-gallery', { waitUntil: 'networkidle' })
      const firstName = language === 'bs' ? 'Poređenje fotografija prije i poslije, 1 od 2' : 'Before and after photo comparison, 1 of 2'
      const secondName = language === 'bs' ? 'Poređenje fotografija prije i poslije, 2 od 2' : 'Before and after photo comparison, 2 of 2'
      const first = page.getByRole('slider', { name: firstName, exact: true })
      const second = page.getByRole('slider', { name: secondName, exact: true })
      await expect(first).toBeVisible()
      await expect(second).toBeVisible()
      await first.focus()
      await page.keyboard.press('ArrowRight')
      await expect(first).toHaveAttribute('aria-valuenow', '52')
      await expect(second).toHaveAttribute('aria-valuenow', '50')
      await second.focus()
      await page.keyboard.press('ArrowLeft')
      await expect(second).toHaveAttribute('aria-valuenow', '48')
      await expect(first).toHaveAttribute('aria-valuenow', '52')
    })
  }
}

test('slider names reflect the currently loaded pages', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', 'en') })
  let started = false, release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/uploads/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>' }))
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/settings/public') return route.fulfill({ json: [] })
    if (url.pathname === '/api/users/profile') return route.fulfill({ json: profile })
    if (url.pathname === '/api/services/admin/services/svc-1') return route.fulfill({ json: { id: 'svc-1', name: 'Fixture service', durationMinutes: 30 } })
    if (url.pathname === '/api/daily-log/before-after') {
      if (url.searchParams.get('offset') === '0') return route.fulfill({ json: { items: [pair('first')], hasMore: true, nextOffset: 1 } })
      started = true; await gate
      return route.fulfill({ json: { items: [pair('second')], hasMore: false, nextOffset: 2 } })
    }
    return route.fulfill({ json: {} })
  })
  try {
    await page.goto('/admin/services/svc-1/work-gallery', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('slider', { name: 'Before and after photo comparison', exact: true })).toBeVisible()
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await expect.poll(() => started).toBe(true)
    release()
    await expect(page.getByRole('slider', { name: 'Before and after photo comparison, 1 of 2', exact: true })).toBeVisible()
    await expect(page.getByRole('slider', { name: 'Before and after photo comparison, 2 of 2', exact: true })).toBeVisible()
  } finally { release() }
})
