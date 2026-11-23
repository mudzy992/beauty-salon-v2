import { expect, test, type Page, type Route } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const stylist = { id: 'stylist-1', userId: 'user-1', bio: 'Original bio', specialization: 'Cut', status: 'ACTIVE', isActive: true, hireDate: null, user: { username: 'hair.one', firstName: 'Hair', lastName: 'One', email: null } }
const hours = [{ dayOfWeek: 1, startTime: '10:00', endTime: '18:00', isWorkingDay: true }]
async function setup(page: Page, language: string, handler: (route: Route, path: string) => Promise<void>) {
  await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    if (path === '/api/users/profile') return route.fulfill({ json: profile })
    return handler(route, path)
  })
}

for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`stylist list read failure has a retry ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      let attempts = 0
      await setup(page, language, async (route, path) => {
        if (path === '/api/stylists/admin') { attempts++; return route.fulfill(attempts === 1 ? { status: 500, json: {} } : { json: [stylist] }) }
        if (path === '/api/services/admin/services') return route.fulfill({ json: [{ id: 'svc-1', name: 'Cut' }] })
        return route.fulfill({ json: {} })
      })
      await page.goto('/admin/stylists', { waitUntil: 'networkidle' })
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
      const retry = page.getByRole('button', { name: language === 'en' ? 'Try again' : 'Pokušaj ponovo' })
      await expect(retry).toBeVisible()
      await retry.click()
      await expect(page.getByText('hair.one')).toBeVisible()
      expect(attempts).toBe(2)
    })
  }
}

for (const failing of ['hours', 'assignments', 'catalog', 'invalid-hours', 'invalid-assignments', 'incomplete-assignments', 'missing-service', 'override-hours', 'duplicate-hours'] as const) {
  for (const width of [320, 1280]) {
    test(`failed ${failing} editor read cannot write defaults, retry preserves data ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      let failingEnabled = true
      const writes: Array<{ method: string; path: string; body: any }> = []
      await setup(page, 'en', async (route, path) => {
        const req = route.request()
        if (req.method() !== 'GET') { writes.push({ method: req.method(), path, body: req.postDataJSON() }); return route.fulfill({ json: {} }) }
        if (path === '/api/stylists/admin') return route.fulfill({ json: [stylist] })
        if (path === '/api/stylists/stylist-1/working-hours') return route.fulfill(failingEnabled && failing === 'hours' ? { status: 500, json: {} } : { json: failingEnabled && failing === 'invalid-hours' ? {} : failingEnabled && failing === 'override-hours' ? [{ ...hours[0], dateOverride: '2030-01-01T00:00:00.000Z' }] : failingEnabled && failing === 'duplicate-hours' ? [hours[0], { ...hours[0], startTime: '19:00' }] : hours })
        if (path === '/api/stylists/admin/stylist-1/services') return route.fulfill(failingEnabled && failing === 'assignments' ? { status: 500, json: {} } : { json: failingEnabled && failing === 'invalid-assignments' ? {} : failingEnabled && failing === 'incomplete-assignments' ? { items: [{ serviceId: 'svc-1' }], total: 2, hasMore: false } : failingEnabled && failing === 'missing-service' ? [{ serviceId: 'missing' }] : [{ serviceId: 'svc-1' }] })
        if (path === '/api/services/admin/services') return route.fulfill(failingEnabled && failing === 'catalog' ? { status: 500, json: {} } : { json: [{ id: 'svc-1', name: 'Cut' }] })
        return route.fulfill({ json: {} })
      })
      await page.goto('/admin/stylists', { waitUntil: 'networkidle' })
      await page.getByRole('button', { name: /edit stylist profile/i }).click()
      const dialog = page.getByRole('dialog', { name: 'Stylist profile' })
      await expect(dialog.getByRole('alert')).toContainText(failing === 'override-hours' || failing === 'duplicate-hours' ? 'This editor cannot safely change it.' : 'Could not load stylist profile data.')
      await expect(dialog.getByRole('button', { name: 'Save', exact: true })).toBeDisabled()
      expect(writes).toHaveLength(0)
      failingEnabled = false
      await dialog.getByRole('button', { name: 'Try again' }).click()
      await expect(dialog.locator('#stylists-bio')).toHaveValue('Original bio')
      await dialog.getByRole('tab', { name: 'Competencies' }).click()
      await expect(dialog.getByText('Cut', { exact: true })).toBeVisible()
      await dialog.getByRole('tab', { name: 'Working hours' }).click()
      await expect(dialog.getByLabel('Start of working hours for Monday')).toHaveValue('10:00')
      await dialog.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(dialog).toBeHidden()
      expect(writes).toHaveLength(3)
      expect(writes.find(w => w.path.endsWith('/services'))?.body).toEqual({ serviceIds: ['svc-1'] })
      expect(writes.find(w => w.path.endsWith('/working-hours'))?.body.workingHours[1]).toEqual(hours[0])
    })
  }
}

for (const oldStatus of [200, 500]) {
  test(`closing editor invalidates older ${oldStatus} read after another stylist opens`, async ({ page }) => {
    const second = { ...stylist, id: 'stylist-2', userId: 'user-2', bio: 'Second bio', user: { ...stylist.user, username: 'hair.two' } }
    let release!: () => void, started = false
    const gate = new Promise<void>(resolve => { release = resolve })
    await setup(page, 'en', async (route, path) => {
      if (path === '/api/stylists/admin') return route.fulfill({ json: [stylist, second] })
      if (path === '/api/services/admin/services') return route.fulfill({ json: [{ id: 'svc-1', name: 'Cut' }] })
      if (path === '/api/stylists/stylist-1/working-hours') { started = true; await gate; return oldStatus === 200 ? route.fulfill({ json: hours }) : route.fulfill({ status: 500, json: {} }) }
      if (path === '/api/stylists/stylist-2/working-hours') return route.fulfill({ json: hours })
      if (/\/api\/stylists\/admin\/stylist-[12]\/services/.test(path)) return route.fulfill({ json: [{ serviceId: 'svc-1' }] })
      return route.fulfill({ json: {} })
    })
    try {
      await page.goto('/admin/stylists', { waitUntil: 'networkidle' })
      const first = page.getByRole('row').filter({ hasText: 'hair.one' }).getByRole('button', { name: /edit stylist profile/i })
      await first.click()
      await expect.poll(() => started).toBe(true)
      const dialog = page.getByRole('dialog', { name: 'Stylist profile' })
      await expect(dialog.getByRole('status')).toContainText('Loading')
      await expect(dialog.getByRole('button', { name: 'Save' })).toBeDisabled()
      await dialog.getByRole('button', { name: 'Cancel' }).click()
      await expect(dialog).toBeHidden()
      await expect(first).toBeFocused()
      await page.getByRole('row').filter({ hasText: 'hair.two' }).getByRole('button', { name: /edit stylist profile/i }).click()
      await expect(dialog.locator('#stylists-bio')).toHaveValue('Second bio')
      const response = page.waitForResponse(r => r.url().includes('/stylist-1/working-hours'))
      release()
      await response
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
      await expect(dialog.locator('#stylists-bio')).toHaveValue('Second bio')
      await expect(dialog.getByRole('alert')).toHaveCount(0)
      await expect(dialog.getByRole('button', { name: 'Save' })).toBeEnabled()
    } finally { release() }
  })
}

test('session change during profile PATCH does not start replacement writes', async ({ page }) => {
  let release!: () => void, started = false
  const gate = new Promise<void>(resolve => { release = resolve })
  const writes: string[] = []
  await setup(page, 'en', async (route, path) => {
    const req = route.request()
    if (req.method() !== 'GET') {
      writes.push(`${req.method()} ${path}`)
      if (req.method() === 'PATCH') { started = true; await gate }
      return route.fulfill({ json: {} })
    }
    if (path === '/api/stylists/admin') return route.fulfill({ json: [stylist] })
    if (path === '/api/services/admin/services') return route.fulfill({ json: [{ id: 'svc-1', name: 'Cut' }] })
    if (path === '/api/stylists/stylist-1/working-hours') return route.fulfill({ json: hours })
    if (path === '/api/stylists/admin/stylist-1/services') return route.fulfill({ json: [{ serviceId: 'svc-1' }] })
    return route.fulfill({ json: {} })
  })
  try {
    await page.goto('/admin/stylists', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /edit stylist profile/i }).click()
    const dialog = page.getByRole('dialog', { name: 'Stylist profile' })
    await expect(dialog.locator('#stylists-bio')).toHaveValue('Original bio')
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect.poll(() => started).toBe(true)
    await page.evaluate(() => { localStorage.setItem('token', 'different-session-token'); localStorage.setItem('auth-session-revision', 'new-session') })
    const response = page.waitForResponse(r => r.request().method() === 'PATCH' && r.url().includes('/api/stylists/stylist-1'))
    release()
    await response
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    expect(writes).toEqual(['PATCH /api/stylists/stylist-1'])
    await expect(dialog).toBeHidden()
  } finally { release() }
})

test('stylist editor consumes all pages before replacement writes', async ({ page }) => {
  const writes: Array<{ path: string; body: any }> = []
  const pages: string[] = []
  await setup(page, 'en', async (route, path) => {
    const req = route.request(), url = new URL(req.url())
    if (req.method() !== 'GET') { writes.push({ path, body: req.postDataJSON() }); return route.fulfill({ json: {} }) }
    if (path === '/api/stylists/admin') return route.fulfill({ json: [stylist] })
    if (path === '/api/stylists/stylist-1/working-hours') return route.fulfill({ json: hours })
    if (path === '/api/services/admin/services' || path === '/api/stylists/admin/stylist-1/services') {
      const pageNumber = Number(url.searchParams.get('page'))
      pages.push(`${path}:${pageNumber}`)
      const item = path.includes('/services/admin/') ? { id: `svc-${pageNumber + 1}`, name: pageNumber ? 'Colour' : 'Cut' } : { serviceId: `svc-${pageNumber + 1}` }
      return route.fulfill({ json: { items: [item], total: 2, page: pageNumber, pageSize: 50, hasMore: pageNumber === 0, nextPage: pageNumber === 0 ? 1 : null } })
    }
    return route.fulfill({ json: {} })
  })
  await page.goto('/admin/stylists', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /edit stylist profile/i }).click()
  const dialog = page.getByRole('dialog', { name: 'Stylist profile' })
  await expect(dialog.locator('#stylists-specialization-auto')).toHaveValue('Cut, Colour')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(dialog).toBeHidden()
  expect(writes.find(w => w.path.endsWith('/services'))?.body).toEqual({ serviceIds: ['svc-1', 'svc-2'] })
  expect(pages).toContain('/api/services/admin/services:1')
  expect(pages).toContain('/api/stylists/admin/stylist-1/services:1')
})

for (const width of [320, 1280]) {
  test(`stylist editor localizes failure and retry in Bosnian ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    let failed = true
    await setup(page, 'bs', async (route, path) => {
      if (path === '/api/stylists/admin') return route.fulfill({ json: [stylist] })
      if (path === '/api/services/admin/services') return route.fulfill({ json: [{ id: 'svc-1', name: 'Cut' }] })
      if (path === '/api/stylists/stylist-1/working-hours') return failed ? route.fulfill({ status: 500, json: {} }) : route.fulfill({ json: hours })
      if (path === '/api/stylists/admin/stylist-1/services') return route.fulfill({ json: [{ serviceId: 'svc-1' }] })
      return route.fulfill({ json: {} })
    })
    await page.goto('/admin/stylists', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /Uredi profil stiliste/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Profil stiliste' })
    await expect(dialog.getByRole('alert')).toContainText('Nije moguće učitati podatke profila stiliste.')
    await expect(dialog.getByRole('button', { name: 'Sačuvaj' })).toBeDisabled()
    failed = false
    await dialog.getByRole('button', { name: 'Pokušaj ponovo' }).click()
    await expect(dialog.locator('#stylists-bio')).toHaveValue('Original bio')
  })
}

test('late stylist save refreshes the current page rather than the page at save start', async ({ page }) => {
  const second = { ...stylist, id: 'stylist-2', userId: 'user-2', user: { ...stylist.user, username: 'hair.two' } }
  let release!: () => void, started = false, serviceWrite = false
  const gate = new Promise<void>(resolve => { release = resolve })
  const reads: number[] = []
  await setup(page, 'en', async (route, path) => {
    const req = route.request(), url = new URL(req.url())
    if (req.method() !== 'GET') {
      if (req.method() === 'PATCH') { started = true; await gate }
      if (path.endsWith('/services')) serviceWrite = true
      return route.fulfill({ json: {} })
    }
    if (path === '/api/stylists/admin') {
      const n = Number(url.searchParams.get('page'))
      reads.push(n)
      return route.fulfill({ json: { items: [n === 0 ? stylist : second], total: 21, page: n, pageSize: 20 } })
    }
    if (path === '/api/services/admin/services') return route.fulfill({ json: [{ id: 'svc-1', name: 'Cut' }] })
    if (path === '/api/stylists/stylist-1/working-hours') return route.fulfill({ json: hours })
    if (path === '/api/stylists/admin/stylist-1/services') return route.fulfill({ json: [{ serviceId: 'svc-1' }] })
    return route.fulfill({ json: {} })
  })
  try {
    await page.goto('/admin/stylists', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /edit stylist profile/i }).click()
    const dialog = page.getByRole('dialog', { name: 'Stylist profile' })
    await expect(dialog.locator('#stylists-bio')).toHaveValue('Original bio')
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect.poll(() => started).toBe(true)
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await page.getByRole('button', { name: 'Next', exact: true }).click()
    await expect(page.getByText('hair.two')).toBeVisible()
    const before = reads.length
    release()
    await expect.poll(() => serviceWrite && reads.length > before).toBe(true)
    await expect(page.getByText('hair.two')).toBeVisible()
    await expect(page.getByText('hair.one')).toHaveCount(0)
    expect(reads[reads.length - 1]).toBe(1)
  } finally { release() }
})
