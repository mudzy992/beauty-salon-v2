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

const client = { id: 'client-1', username: 'sample.client', email: 'sample@example.test', firstName: 'Sample', lastName: 'Client', phone: '123456', gender: 'FEMALE', avatar: null, isActive: true, isEmailVerified: true, createdAt: '2026-01-01T00:00:00Z', userRoles: [{ role: { name: 'CLIENT' } }, { role: { name: 'STYLIST' } }], stylistProfile: { id: 'stylist-1', status: 'ACTIVE' } }

for (const width of [320, 1280]) {
  test(`user editor and one-time creation credentials ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    const writes: Array<{ path: string; body: unknown }> = []
    await setup(page, async (route, path) => {
      const req = route.request()
      if (req.method() !== 'GET') {
        writes.push({ path, body: req.postDataJSON() })
        return route.fulfill({ json: path === '/api/users' ? { username: 'new.user', initialPassword: 'Example-only-Password!' } : {} })
      }
      if (path === '/api/users/clients/admin') return route.fulfill({ json: { items: [client], total: 1, page: 0, pageSize: 20 } })
      if (path === '/api/users/username-availability' || path.endsWith('/username-availability')) return route.fulfill({ json: { available: true, suggestions: [] } })
      if (path === '/api/client-debts' || path === '/api/users/system-admins' || path === '/api/users/stylists' || path === '/api/users/password-reset-candidates') return route.fulfill({ json: [] })
      return route.fulfill({ json: {} })
    })
    await page.goto('/admin/users', { waitUntil: 'networkidle' })
    const root = page.locator('[data-admin-users]')
    const edit = root.getByRole('button', { name: 'Edit user sample.client', exact: true })
    await edit.click()
    let dialog = page.getByRole('dialog')
    await expect(dialog.locator('#users-username')).toHaveValue('sample.client')
    await expect(dialog.getByText('No open debts.')).toBeVisible()
    await dialog.locator('#users-phone').fill('777')
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(dialog).toBeHidden()
    expect(writes[0]).toEqual({ path: '/api/users/client-1', body: { username: 'sample.client', firstName: 'Sample', lastName: 'Client', email: 'sample@example.test', phone: '777', isActive: true } })
    const create = root.getByRole('button', { name: 'New user', exact: true })
    await create.click()
    dialog = page.getByRole('dialog')
    await dialog.locator('#users-auth-first-name-2').fill('New')
    await dialog.locator('#users-auth-last-name-2').fill('User')
    await dialog.locator('#users-create-gender').selectOption('FEMALE')
    await expect(dialog.locator('#users-users-username-2')).toHaveValue('new.user')
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    const creds = page.getByRole('dialog', { name: 'User sign-in details (shown once)' })
    await expect(creds).toContainText('Example-only-Password!')
    expect(writes[1]).toEqual({ path: '/api/users', body: { username: 'new.user', firstName: 'New', lastName: 'User', role: 'CLIENT', gender: 'FEMALE' } })
    await creds.getByRole('button', { name: 'Got it' }).click()
    await expect(creds).toBeHidden()
    await expect(page.getByText('Example-only-Password!')).toHaveCount(0)
    await expect(create).toBeFocused()
  })

  test(`stylist role removal preserves transfers and confirmation ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    const writes: Array<{ path: string; body: unknown }> = []
    await setup(page, async (route, path) => {
      const req = route.request()
      if (req.method() !== 'GET') { writes.push({ path, body: req.postDataJSON() }); return route.fulfill({ json: {} }) }
      if (path === '/api/users/clients/admin') return route.fulfill({ json: { items: [client], total: 1, page: 0, pageSize: 20 } })
      if (path === '/api/users/system-admins' || path === '/api/users/stylists' || path === '/api/users/password-reset-candidates') return route.fulfill({ json: [] })
      if (path === '/api/users/client-1/stylist-removal-preview') return route.fulfill({ json: { stylistProfileId: 'stylist-1', revision: 'a'.repeat(64), financial: { clientDebtsCount: 1, manualIncomeCount: 0, bookedDailyLogsCount: 1 }, counts: { dailyLogEntriesCount: 2, confirmedReservationsCount: 1, reservationResponsesCount: 0, reviewsCount: 0 } } })
      if (path === '/api/stylists/admin') return route.fulfill({ json: [{ id: 'stylist-2', isActive: true, status: 'ACTIVE', user: { isActive: true, username: 'target' } }] })
      return route.fulfill({ json: {} })
    })
    await page.goto('/admin/users', { waitUntil: 'networkidle' })
    const remove = page.getByRole('button', { name: 'Remove Stylist role from sample.client' })
    await remove.click()
    const dialog = page.getByRole('dialog', { name: 'Remove stylist role' })
    await expect(dialog.locator('fieldset')).toHaveCount(2)
    const confirm = dialog.getByRole('button', { name: 'Remove stylist role', exact: true })
    await expect(confirm).toBeDisabled()
    await dialog.locator('#users-financial-transfer-target').selectOption('stylist-2')
    await dialog.locator('input[type=checkbox]').check()
    await dialog.locator('#users-stylist-removal-target-dailyLogs').selectOption('stylist-2')
    await dialog.locator('#users-stylist-removal-target-confirmedReservations').selectOption('stylist-2')
    await expect(confirm).toBeEnabled()
    await confirm.click()
    await expect(dialog).toBeHidden()
    expect(writes).toEqual([{ path: '/api/users/client-1/remove-stylist-role', body: { previewRevision: 'a'.repeat(64), financialTargetStylistProfileId: 'stylist-2', confirmFinancialTransfer: true, dailyLogs: { mode: 'TRANSFER', targetStylistProfileId: 'stylist-2' }, confirmedReservations: { mode: 'TRANSFER', targetStylistProfileId: 'stylist-2' }, reservationResponses: { mode: 'DELETE' }, reviews: { mode: 'DELETE' } } }])
  })
}

test('stylist editor preserves profile, hours and competency write contracts', async ({ page }) => {
  const writes: Array<{ method: string; path: string; body: any }> = []
  const stylist = { id: 'stylist-1', userId: 'user-1', bio: 'Original bio', specialization: 'Cut', status: 'ACTIVE', isActive: true, hireDate: null, user: { username: 'hair.one', firstName: 'Hair', lastName: 'One', email: null } }
  await setup(page, async (route, path) => {
    const req = route.request()
    if (req.method() !== 'GET') { writes.push({ method: req.method(), path, body: req.postDataJSON() }); return route.fulfill({ json: {} }) }
    if (path === '/api/stylists/admin') return route.fulfill({ json: [stylist] })
    if (path === '/api/services/admin/services') return route.fulfill({ json: [{ id: 'svc-1', name: 'Cut' }, { id: 'svc-2', name: 'Colour' }] })
    if (path === '/api/stylists/stylist-1/working-hours') return route.fulfill({ json: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isWorkingDay: true }] })
    if (path === '/api/stylists/admin/stylist-1/services') return route.fulfill({ json: [{ serviceId: 'svc-1' }] })
    return route.fulfill({ json: {} })
  })
  await page.goto('/admin/stylists', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /edit stylist profile/i }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.locator('#stylists-bio')).toHaveValue('Original bio')
  await dialog.locator('#stylists-bio').fill('Updated bio')
  await dialog.getByRole('tab', { name: 'Working hours' }).click()
  await expect(dialog.getByRole('table')).toBeVisible()
  await expect(dialog.getByRole('row')).toHaveCount(8)
  await dialog.getByRole('tab', { name: 'Competencies' }).click()
  await dialog.getByRole('checkbox', { name: 'Colour' }).click()
  await expect(dialog.getByRole('checkbox', { name: 'Colour' })).toHaveCount(0)
  await expect(dialog.getByText('Colour', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(dialog).toBeHidden()
  expect(writes).toHaveLength(3)
  expect(writes.find(w => w.path === '/api/stylists/stylist-1')).toEqual({ method: 'PATCH', path: '/api/stylists/stylist-1', body: { bio: 'Updated bio', specialization: 'Cut, Colour', isActive: true } })
  expect(writes.find(w => w.path.endsWith('/services'))?.body).toEqual({ serviceIds: ['svc-1', 'svc-2'] })
  expect(writes.find(w => w.path.endsWith('/working-hours'))?.body.workingHours).toHaveLength(7)
})

test('salon holiday editor preserves create request', async ({ page }) => {
  const writes: Array<{ path: string; body: unknown }> = []
  const salon = { id: 'salon-1', name: 'Fixture salon', workingHours: [{ dayOfWeek: 1, openTime: '09:00', closeTime: '17:00', isWorkingDay: true }], holidays: [] }
  await setup(page, async (route, path) => {
    const req = route.request()
    if (req.method() !== 'GET') { writes.push({ path, body: req.postDataJSON() }); return route.fulfill({ json: {} }) }
    if (path === '/api/salon/list') return route.fulfill({ json: [salon] })
    if (path === '/api/salon/salon-1') return route.fulfill({ json: salon })
    return route.fulfill({ json: {} })
  })
  await page.goto('/admin/salon', { waitUntil: 'networkidle' })
  await page.getByRole('tab', { name: 'Holidays' }).click()
  await page.getByRole('button', { name: 'New holiday' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('#salon-holiday-form-date').fill('2026-12-25')
  await dialog.locator('#salon-holiday-form-name').fill('Fixture holiday')
  await dialog.locator('#salon-holiday-form-message').fill('Closed today')
  await dialog.getByRole('switch').click()
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(dialog).toBeHidden()
  expect(writes).toEqual([{ path: '/api/salon/salon-1/holidays', body: { date: '2026-12-25', name: 'Fixture holiday', message: 'Closed today', sendPush: true } }])
})

test('service editor preserves category, subcategory and service writes', async ({ page }) => {
  const writes: Array<{ path: string; body: unknown }> = []
  const category = { id: 'cat', name: 'Category fixture', description: 'Category description', sortOrder: 2, isActive: true }
  const subcategory = { id: 'sub', categoryId: 'cat', name: 'Subcategory fixture', description: 'Sub description', sortOrder: 3, isActive: true }
  const service = { id: 'svc', subcategoryId: 'sub', name: 'Fixture service', shortDescription: 'Existing description', durationMinutes: 30, price: 25, gender: 'FEMALE', sortOrder: 1, isActive: true, heroImage: null, loyaltyEnabled: false, loyaltyMaxDiscountPercent: 0 }
  await setup(page, async (route, path) => {
    const req = route.request()
    if (req.method() !== 'GET') { writes.push({ path, body: req.postDataJSON() }); return route.fulfill({ json: {} }) }
    if (path === '/api/services/admin/categories') return route.fulfill({ json: [category] })
    if (path === '/api/services/admin/subcategories') return route.fulfill({ json: [subcategory] })
    if (path === '/api/services/admin/services') return route.fulfill({ json: [service] })
    return route.fulfill({ json: {} })
  })
  await page.goto('/admin/services', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Edit category: Category fixture', exact: true }).click()
  let dialog = page.getByRole('dialog')
  await expect(dialog.locator('#services-common-name')).toHaveValue('Category fixture')
  await dialog.locator('#services-common-name').fill('Changed category')
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(dialog).toBeHidden()
  expect(writes[0]).toEqual({ path: '/api/services/categories/cat', body: { name: 'Changed category', description: 'Category description', sortOrder: 2, isActive: true } })
  await page.getByRole('button', { name: /Category fixture/, expanded: false }).click()
  await page.getByRole('button', { name: 'Edit subcategory: Subcategory fixture' }).click()
  dialog = page.getByRole('dialog')
  await expect(dialog.locator('#services-common-name-2')).toHaveValue('Subcategory fixture')
  await dialog.locator('#services-common-name-2').fill('Changed subcategory')
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(dialog).toBeHidden()
  expect(writes[1]).toEqual({ path: '/api/services/subcategories/sub', body: { name: 'Changed subcategory', description: 'Sub description', sortOrder: 3, isActive: true } })
  await page.getByRole('button', { name: /Category fixture/, expanded: false }).click()
  await page.getByRole('button', { name: 'Edit service: Fixture service' }).click()
  dialog = page.getByRole('dialog')
  await expect(dialog.locator('#services-service-name')).toHaveValue('Fixture service')
  await dialog.locator('#services-short-description').fill('Updated description')
  await dialog.locator('#services-price').fill('42')
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(dialog).toBeHidden()
  expect(writes[2]).toEqual({ path: '/api/services/svc', body: { name: 'Fixture service', shortDescription: 'Updated description', durationMinutes: 30, price: 42, gender: 'FEMALE', sortOrder: 1, isActive: true, heroImage: '', loyaltyEnabled: false, loyaltyMaxDiscountPercent: 0 } })
  expect(writes).toHaveLength(3)
})

test('service work gallery retries and paginates without losing earlier pairs', async ({ page }) => {
  const offsets: string[] = []
  let releaseSecond!: () => void
  const secondPageGate = new Promise<void>(resolve => { releaseSecond = resolve })
  let firstRequest = true
  await setup(page, async (route, path) => {
    if (path === '/api/services/admin/services/svc-1') return route.fulfill({ json: { id: 'svc-1', name: 'Gallery fixture', durationMinutes: 30 } })
    if (path === '/api/daily-log/before-after') {
      const url = new URL(route.request().url()), offset = url.searchParams.get('offset') ?? ''
      offsets.push(offset)
      if (firstRequest) { firstRequest = false; return route.fulfill({ status: 500, json: {} }) }
      if (offset === '1') await secondPageGate
      const pair = (id: string) => ({ id, before: { pathOriginal: '/brand/aurum-hero-editorial.jpg' }, after: { pathOriginal: '/brand/aurum-hero-editorial.jpg' } })
      return route.fulfill({ json: offset === '0' ? { items: [pair('one')], hasMore: true, nextOffset: 1 } : { items: [pair('two')], hasMore: false, nextOffset: 2 } })
    }
    return route.fulfill({ json: {} })
  })
  await page.goto('/admin/services/svc-1/work-gallery', { waitUntil: 'networkidle' })
  await expect(page.getByText('Gallery fixture')).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('Completed work couldn’t be loaded')
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('slider')).toHaveCount(1)
  await page.getByRole('slider').first().scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await expect.poll(() => offsets).toContain('1')
  releaseSecond()
  await expect(page.getByRole('slider')).toHaveCount(2)
  expect(offsets).toEqual(['0', '0', '1'])
  const slider = page.getByRole('slider').first()
  await slider.focus()
  await page.keyboard.press('ArrowRight')
  await expect(slider).toHaveAttribute('aria-valuenow', '52')
})
