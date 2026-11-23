import { expect, test } from '@playwright/test'

test('salon list fallback loads details and initializes missing hours', async ({ page }) => {
  const requests: string[] = []
  await page.addInitScript(() => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', 'en') })
  await page.route('**/api/**', async route => {
    const { pathname } = new URL(route.request().url())
    requests.push(`${route.request().method()} ${pathname}`)
    if (pathname === '/api/settings/public') return route.fulfill({ json: [] })
    if (pathname === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
    if (pathname === '/api/salon/list') return route.fulfill({ status: 500, json: {} })
    if (pathname === '/api/salon') return route.fulfill({ json: { id: 'salon-1' } })
    if (pathname === '/api/salon/salon-1') return route.fulfill({ json: { id: 'salon-1', name: 'Fallback salon', workingHours: [], holidays: [] } })
    return route.fulfill({ json: {} })
  })
  await page.goto('/admin/salon', { waitUntil: 'networkidle' })
  await expect(page.locator('#salon-salon-salon-name-2')).toHaveValue('Fallback salon')
  expect(requests).toContain('GET /api/salon')
  expect(requests).toContain('GET /api/salon/salon-1')
  expect(requests).toContain('POST /api/salon/salon-1/working-hours/ensure')
  await page.getByRole('tab', { name: 'Working hours' }).click()
  await expect(page.getByRole('row')).toHaveCount(8)
  await expect(page.getByRole('switch', { name: 'Working day for Monday' })).toBeChecked()
  await expect(page.getByRole('switch', { name: 'Working day for Sunday' })).not.toBeChecked()
  await expect(page.getByLabel('Opening time for Monday')).toHaveValue('09:00')
})
