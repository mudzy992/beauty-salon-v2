import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const holiday = { id: 'h-1', date: '2030-06-01', name: 'Original holiday', message: null, sendPush: true, pushSentAt: null }
const salon = { id: 'salon-1', name: 'Fixture salon', workingHours: [{ dayOfWeek: 1, openTime: '09:00', closeTime: '17:00', isWorkingDay: true }], holidays: [holiday] }

for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`holiday refresh failure has an independent retry ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
      let details = 0, notifications = 0
      await page.route('**/api/**', route => {
        const url = new URL(route.request().url())
        if (url.pathname === '/api/settings/public') return route.fulfill({ json: [] })
        if (url.pathname === '/api/users/profile') return route.fulfill({ json: profile })
        if (url.pathname === '/api/salon/list') return route.fulfill({ json: [salon] })
        if (url.pathname.endsWith('/send-notification')) { notifications++; return route.fulfill({ json: {} }) }
        if (url.pathname === '/api/salon/salon-1') { details++; return route.fulfill({ json: details === 1 ? { id: salon.id, holidays: null } : { ...salon, holidays: [{ ...holiday, name: 'Recovered holiday' }] } }) }
        return route.fulfill({ json: {} })
      })
      await page.goto('/admin/salon', { waitUntil: 'networkidle' })
      const holidayTab = page.getByRole('tab', { name: language === 'bs' ? 'Praznici' : 'Holidays' })
      await holidayTab.click()
      await page.getByRole('button', { name: language === 'bs' ? /Pošalji notifikaciju.*Original holiday/ : /Send notification.*Original holiday/ }).click()
      const alert = page.getByRole('alert').filter({ hasText: language === 'bs' ? 'Nije moguće učitati praznike' : 'Could not load holidays' })
      await expect(alert).toBeVisible()
      await expect(alert).toContainText(language === 'bs' ? 'Prikazani praznici možda nisu ažurni.' : 'Displayed holidays may be out of date.')
      await expect(page.getByRole('row').filter({ hasText: 'Original holiday' })).toBeVisible()
      const axe = await new AxeBuilder({ page }).include('[data-admin-state="error"]').withRules(['button-name', 'label-content-name-mismatch', 'aria-valid-attr']).analyze()
      expect(axe.violations).toEqual([])
      const retry = alert.getByRole('button', { name: language === 'bs' ? 'Pokušaj ponovo' : 'Try again' })
      await retry.focus()
      await page.keyboard.press('Enter')
      await expect(page.getByRole('row').filter({ hasText: 'Recovered holiday' })).toBeVisible()
      await expect(alert).toHaveCount(0)
      await expect(holidayTab).toBeFocused()
      expect(details).toBe(2)
      expect(notifications).toBe(1)
    })
  }
}

test('retry announces loading and does not steal focus moved elsewhere', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', 'en') })
  let release!: () => void, details = 0
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    if (path === '/api/users/profile') return route.fulfill({ json: profile })
    if (path === '/api/salon/list') return route.fulfill({ json: [salon] })
    if (path.endsWith('/send-notification')) return route.fulfill({ json: {} })
    if (path === '/api/salon/salon-1') {
      details++
      if (details === 1) return route.fulfill({ status: 500, json: {} })
      await gate; return route.fulfill({ json: salon })
    }
    return route.fulfill({ json: {} })
  })
  try {
    await page.goto('/admin/salon', { waitUntil: 'networkidle' })
    await page.getByRole('tab', { name: 'Holidays' }).click()
    await page.getByRole('button', { name: /Send notification.*Original holiday/ }).click()
    const alert = page.getByRole('alert').filter({ hasText: 'Could not load holidays' })
    const retry = alert.getByRole('button', { name: 'Try again' })
    await retry.focus(); await page.keyboard.press('Enter')
    await expect.poll(() => details).toBe(2)
    await expect(alert.getByRole('status')).toBeVisible()
    await expect(retry).toBeDisabled()
    const otherTab = page.getByRole('tab', { name: 'Basic settings' })
    await otherTab.focus()
    const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/salon/salon-1')
    release(); await response
    await expect(alert).toHaveCount(0)
    await expect(otherTab).toBeFocused()
  } finally { release() }
})

test('failed refresh after creating from an empty list does not claim there are no holidays', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', 'en') })
  let reads = 0, creates = 0
  await page.route('**/api/**', route => {
    const req = route.request(), path = new URL(req.url()).pathname
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    if (path === '/api/users/profile') return route.fulfill({ json: profile })
    if (path === '/api/salon/list') return route.fulfill({ json: [{ ...salon, holidays: [] }] })
    if (path === '/api/salon/salon-1/holidays' && req.method() === 'POST') { creates++; return route.fulfill({ json: {} }) }
    if (path === '/api/salon/salon-1') { reads++; return reads === 1 ? route.fulfill({ status: 500, json: {} }) : route.fulfill({ json: salon }) }
    return route.fulfill({ json: {} })
  })
  await page.goto('/admin/salon', { waitUntil: 'networkidle' })
  await page.getByRole('tab', { name: 'Holidays' }).click()
  await expect(page.getByText('No holidays.')).toBeVisible()
  await page.getByRole('button', { name: 'New holiday' }).click()
  const dialog = page.getByRole('dialog', { name: 'New holiday' })
  await dialog.locator('#salon-holiday-form-date').fill('2030-06-01')
  await dialog.locator('#salon-holiday-form-name').fill('Original holiday')
  await dialog.getByRole('button', { name: 'Save' }).click()
  const alert = page.getByRole('alert').filter({ hasText: 'Could not load holidays' })
  await expect(alert).toBeVisible()
  await expect(page.getByText('No holidays.')).toHaveCount(0)
  await alert.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('row').filter({ hasText: 'Original holiday' })).toBeVisible()
  expect(creates).toBe(1)
  expect(reads).toBe(2)
})
