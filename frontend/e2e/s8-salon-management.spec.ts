import { expect, test, type Page, type Route } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
async function setup(page: Page, handler: (route: Route, path: string) => Promise<void>) {
  await page.addInitScript(() => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', 'en') })
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    if (path === '/api/users/profile') return route.fulfill({ json: profile })
    return handler(route, path)
  })
}

type Write = { method: string; path: string; body: unknown }
function capture(route: Route, path: string): Write {
  const req = route.request()
  return { method: req.method(), path, body: req.postData() ? req.postDataJSON() : null }
}
const holiday = { id: 'holiday-1', date: '2030-06-01T00:00:00.000Z', name: 'Summer', message: 'Closed', sendPush: true, pushSentAt: null }
const salon = { id: 'salon-1', name: 'Fixture salon', address: 'Main street', phone: '123', email: 's@example.test', description: 'Welcome', pauseBetweenServices: 15, cancellationDeadlineHours: 12, maxCancellationsBeforePenalty: 2, penaltyDurationDays: 10, reservationLockMinutes: 20, workingHours: [{ dayOfWeek: 1, openTime: '09:00', closeTime: '17:00', isWorkingDay: true }], holidays: [holiday] }

for (const width of [320, 1280]) {
  test(`salon settings and working hours preserve write payloads ${width}`, async ({ page }) => {
    const writes: Write[] = []
    await page.setViewportSize({ width, height: 800 })
    await setup(page, async (route, path) => {
      if (route.request().method() !== 'GET') { writes.push(capture(route, path)); return route.fulfill({ json: {} }) }
      if (path === '/api/salon/list') return route.fulfill({ json: [salon] })
      return route.fulfill({ json: {} })
    })
    await page.goto('/admin/salon', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await page.locator('#salon-salon-address-2').fill('New street')
    await page.locator('#salon-pause-between').fill('25')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect.poll(() => writes.length).toBe(1)
    expect(writes[0]).toEqual({ method: 'PATCH', path: '/api/salon/salon-1', body: { name: 'Fixture salon', address: 'New street', phone: '123', email: 's@example.test', description: 'Welcome', pauseBetweenServices: 25, cancellationDeadlineHours: 12, maxCancellationsBeforePenalty: 2, penaltyDurationDays: 10, reservationLockMinutes: 20 } })
    await page.getByRole('tab', { name: 'Working hours' }).click()
    await expect(page.getByRole('table')).toBeVisible()
    await expect(page.getByRole('row')).toHaveCount(8)
    await page.getByRole('switch', { name: 'Working day for Sunday' }).click()
    await page.getByLabel('Opening time for Sunday').fill('10:30')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect.poll(() => writes.length).toBe(2)
    const hours = writes[1].body as { workingHours: Array<{ dayOfWeek: number; openTime: string; closeTime: string; isWorkingDay: boolean }> }
    expect(writes[1].method).toBe('POST')
    expect(writes[1].path).toBe('/api/salon/salon-1/working-hours')
    expect(hours.workingHours).toHaveLength(7)
    expect(hours.workingHours[0]).toEqual({ dayOfWeek: 0, openTime: '10:30', closeTime: '17:00', isWorkingDay: true })
    expect(hours.workingHours[1]).toEqual(salon.workingHours[0])
  })
}

test('salon holiday edit, notification and confirmed deletion retain contracts', async ({ page }) => {
  const writes: Write[] = []
  await setup(page, async (route, path) => {
    if (route.request().method() !== 'GET') { writes.push(capture(route, path)); return route.fulfill({ json: {} }) }
    if (path === '/api/salon/list') return route.fulfill({ json: [salon] })
    if (path === '/api/salon/salon-1') return route.fulfill({ json: salon })
    return route.fulfill({ json: {} })
  })
  await page.goto('/admin/salon', { waitUntil: 'networkidle' })
  await page.getByRole('tab', { name: 'Holidays' }).click()
  const row = page.getByRole('row').filter({ hasText: 'Summer' })
  await row.getByRole('button', { name: 'Edit' }).click()
  const editor = page.getByRole('dialog', { name: 'Edit holiday' })
  await expect(editor.locator('#salon-holiday-form-date')).toHaveValue('2030-06-01')
  await editor.locator('#salon-holiday-form-name').fill('Updated holiday')
  await editor.getByRole('button', { name: 'Save' }).click()
  await expect(editor).toBeHidden()
  expect(writes[0]).toEqual({ method: 'PATCH', path: '/api/salon/holidays/holiday-1', body: { date: '2030-06-01', name: 'Updated holiday', message: 'Closed', sendPush: true } })
  await row.getByRole('button', { name: 'Send notification' }).click()
  await expect.poll(() => writes.length).toBe(2)
  expect(writes[1]).toEqual({ method: 'POST', path: '/api/salon/holidays/holiday-1/send-notification', body: null })
  await row.getByRole('button', { name: 'Delete' }).click()
  const confirm = page.getByRole('dialog', { name: 'Confirm deletion' })
  await expect(confirm).toContainText('Delete this holiday?')
  await confirm.getByRole('button', { name: 'Cancel' }).click()
  expect(writes).toHaveLength(2)
  await row.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('dialog', { name: 'Confirm deletion' }).getByRole('button', { name: 'Delete' }).click()
  await expect.poll(() => writes.length).toBe(3)
  expect(writes[2]).toEqual({ method: 'DELETE', path: '/api/salon/holidays/holiday-1', body: null })
})

test('salon absent create form validates name and preserves defaults', async ({ page }) => {
  const writes: Write[] = []
  await setup(page, async (route, path) => {
    if (route.request().method() !== 'GET') { writes.push(capture(route, path)); return route.fulfill({ json: {} }) }
    if (path === '/api/salon/list') return route.fulfill({ json: [] })
    return route.fulfill({ json: {} })
  })
  await page.goto('/admin/salon', { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  await page.getByRole('button', { name: 'Create salon' }).click()
  await expect(page.getByText('Enter the salon name.')).toBeVisible()
  expect(writes).toHaveLength(0)
  await page.locator('#salon-salon-name').fill('New salon')
  await page.locator('#salon-phone').fill('555')
  await page.getByRole('button', { name: 'Create salon' }).click()
  await expect.poll(() => writes.length).toBe(1)
  expect(writes[0]).toEqual({ method: 'POST', path: '/api/salon', body: { name: 'New salon', address: '', phone: '555', email: '', description: '', pauseBetweenServices: 10, cancellationDeadlineHours: 24, maxCancellationsBeforePenalty: 3, penaltyDurationDays: 30, reservationLockMinutes: 15 } })
})
