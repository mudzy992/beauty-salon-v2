import { expect, test, type Page } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const holiday = (id: string, name: string) => ({ id, date: '2030-06-01', name, message: null, sendPush: true, pushSentAt: null })
const salon = { id: 'salon-1', name: 'Fixture salon', workingHours: [{ dayOfWeek: 1, openTime: '09:00', closeTime: '17:00', isWorkingDay: true }], holidays: [holiday('h-1', 'First holiday'), holiday('h-2', 'Second holiday')] }
async function init(page: Page) {
  await page.addInitScript(() => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', 'en') })
}

for (const status of [200, 500]) {
  test(`older holiday reload ${status} cannot replace a newer result`, async ({ page }) => {
    await init(page)
    let release!: () => void, releaseFirstWrite!: () => void, releaseSecondWrite!: () => void, reads = 0, writes = 0
    const gate = new Promise<void>(resolve => { release = resolve })
    const firstWrite = new Promise<void>(resolve => { releaseFirstWrite = resolve })
    const secondWrite = new Promise<void>(resolve => { releaseSecondWrite = resolve })
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url())
      if (url.pathname === '/api/settings/public') return route.fulfill({ json: [] })
      if (url.pathname === '/api/users/profile') return route.fulfill({ json: profile })
      if (url.pathname === '/api/salon/list') return route.fulfill({ json: [salon] })
      if (url.pathname.endsWith('/send-notification')) {
        writes++
        await (url.pathname.includes('/h-1/') ? firstWrite : secondWrite)
        return route.fulfill({ json: {} })
      }
      if (url.pathname === '/api/salon/salon-1') {
        reads++
        if (reads === 1) { await gate; return status === 200 ? route.fulfill({ json: { ...salon, holidays: [holiday('old', 'Stale holiday')] } }) : route.fulfill({ status: 500, json: {} }) }
        return route.fulfill({ json: { ...salon, holidays: [holiday('new', 'Latest holiday')] } })
      }
      return route.fulfill({ json: {} })
    })
    try {
      await page.goto('/admin/salon', { waitUntil: 'networkidle' })
      await page.getByRole('tab', { name: 'Holidays' }).click()
      await page.getByRole('button', { name: /Send notification for holiday: First holiday/ }).click()
      await page.getByRole('button', { name: /Send notification for holiday: Second holiday/ }).click()
      await expect.poll(() => writes).toBe(2)
      releaseFirstWrite()
      await expect.poll(() => reads).toBe(1)
      releaseSecondWrite()
      await expect.poll(() => reads).toBe(2)
      await expect(page.getByRole('row').filter({ hasText: 'Latest holiday' })).toBeVisible()
      const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/salon/salon-1')
      release(); await response
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
      await expect(page.getByRole('row').filter({ hasText: 'Latest holiday' })).toBeVisible()
      await expect(page.getByRole('row').filter({ hasText: 'Stale holiday' })).toHaveCount(0)
      await expect(page.getByText('Could not load holidays.')).toHaveCount(0)
      expect(writes).toBe(2)
    } finally { release(); releaseFirstWrite(); releaseSecondWrite() }
  })
}

test('malformed holiday reload does not replace known holidays with empty state', async ({ page }) => {
  await init(page)
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    if (path === '/api/users/profile') return route.fulfill({ json: profile })
    if (path === '/api/salon/list') return route.fulfill({ json: [salon] })
    if (path.endsWith('/send-notification')) return route.fulfill({ json: {} })
    if (path === '/api/salon/salon-1') return route.fulfill({ json: { id: 'salon-1', holidays: null } })
    return route.fulfill({ json: {} })
  })
  await page.goto('/admin/salon', { waitUntil: 'networkidle' })
  await page.getByRole('tab', { name: 'Holidays' }).click()
  await page.getByRole('button', { name: /Send notification for holiday: First holiday/ }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Could not load holidays.' })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'First holiday' })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Second holiday' })).toBeVisible()
  await expect(page.getByText('No holidays.')).toHaveCount(0)
})

test('a newer full salon reload invalidates an older holiday reload', async ({ page }) => {
  await init(page)
  let release!: () => void, reads = 0, lists = 0
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    if (path === '/api/users/profile') return route.fulfill({ json: profile })
    if (path === '/api/salon/list') return route.fulfill({ json: [++lists === 1 ? salon : { ...salon, holidays: [holiday('new', 'Fresh full reload')] }] })
    if (path === '/api/salon/salon-1' && req.method() === 'PATCH') return route.fulfill({ json: {} })
    if (path.endsWith('/send-notification')) return route.fulfill({ json: {} })
    if (path === '/api/salon/salon-1') { reads++; await gate; return route.fulfill({ json: { ...salon, holidays: [holiday('old', 'Stale detail')] } }) }
    return route.fulfill({ json: {} })
  })
  try {
    await page.goto('/admin/salon', { waitUntil: 'networkidle' })
    await page.getByRole('tab', { name: 'Holidays' }).click()
    await page.getByRole('button', { name: /Send notification for holiday: First holiday/ }).click()
    await expect.poll(() => reads).toBe(1)
    await page.getByRole('tab', { name: 'Basic settings' }).click()
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect.poll(() => lists).toBe(2)
    await page.getByRole('tab', { name: 'Holidays' }).click()
    await expect(page.getByRole('row').filter({ hasText: 'Fresh full reload' })).toBeVisible()
    const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/salon/salon-1' && r.request().method() === 'GET')
    release(); await response
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    await expect(page.getByRole('row').filter({ hasText: 'Fresh full reload' })).toBeVisible()
    await expect(page.getByRole('row').filter({ hasText: 'Stale detail' })).toHaveCount(0)
  } finally { release() }
})

for (const changedSalon of [false, true]) {
  test(`newer holiday read and pending full reload respect salon identity changed=${changedSalon}`, async ({ page }) => {
    await init(page)
    let releaseList!: () => void, releaseWrite!: () => void, lists = 0, writes = 0, details = 0
    const listGate = new Promise<void>(resolve => { releaseList = resolve })
    const writeGate = new Promise<void>(resolve => { releaseWrite = resolve })
    await page.route('**/api/**', async route => {
      const req = route.request(), path = new URL(req.url()).pathname
      if (path === '/api/settings/public') return route.fulfill({ json: [] })
      if (path === '/api/users/profile') return route.fulfill({ json: profile })
      if (path === '/api/salon/list') {
        lists++
        if (lists === 1) return route.fulfill({ json: [salon] })
        await listGate
        return route.fulfill({ json: [changedSalon ? { ...salon, id: 'salon-2', holidays: [holiday('b', 'Second salon holiday')] } : { ...salon, holidays: [holiday('old', 'Stale full reload')] }] })
      }
      if (path.endsWith('/send-notification')) { writes++; await writeGate; return route.fulfill({ json: {} }) }
      if (path === '/api/salon/salon-1' && req.method() === 'PATCH') return route.fulfill({ json: {} })
      if (path === '/api/salon/salon-1') { details++; return route.fulfill({ json: { ...salon, holidays: [holiday('new', 'Fresh detail')] } }) }
      return route.fulfill({ json: {} })
    })
    try {
      await page.goto('/admin/salon', { waitUntil: 'networkidle' })
      await page.getByRole('tab', { name: 'Holidays' }).click()
      await page.getByRole('button', { name: /Send notification for holiday: First holiday/ }).click()
      await expect.poll(() => writes).toBe(1)
      await page.getByRole('tab', { name: 'Basic settings' }).click()
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await expect.poll(() => lists).toBe(2)
      const detailResponse = page.waitForResponse(r => new URL(r.url()).pathname === '/api/salon/salon-1' && r.request().method() === 'GET')
      releaseWrite()
      await detailResponse
      await expect.poll(() => details).toBe(1)
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
      const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/salon/list')
      releaseList(); await response
      await page.getByRole('tab', { name: 'Holidays' }).click()
      await expect(page.getByRole('row').filter({ hasText: changedSalon ? 'Second salon holiday' : 'Fresh detail' })).toBeVisible()
      await expect(page.getByRole('row').filter({ hasText: changedSalon ? 'Fresh detail' : 'Stale full reload' })).toHaveCount(0)
    } finally { releaseList(); releaseWrite() }
  })
}

for (const bad of ['date', 'sendPush', 'id', 'duplicate'] as const) {
  test(`holiday refresh rejects malformed ${bad} data and can recover`, async ({ page }) => {
    await init(page)
    let reads = 0
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/settings/public') return route.fulfill({ json: [] })
      if (path === '/api/users/profile') return route.fulfill({ json: profile })
      if (path === '/api/salon/list') return route.fulfill({ json: [salon] })
      if (path.endsWith('/send-notification')) return route.fulfill({ json: {} })
      if (path === '/api/salon/salon-1') {
        reads++
        const h = holiday('bad', 'Invalid holiday')
        const malformed = bad === 'date' ? [{ ...h, date: '2030-02-30' }]
          : bad === 'sendPush' ? [{ ...h, sendPush: 'yes' }]
          : bad === 'id' ? [{ ...h, id: '' }]
          : [h, h]
        return route.fulfill({ json: { ...salon, holidays: reads === 1 ? malformed : [holiday('recovered', 'Recovered holiday')] } })
      }
      return route.fulfill({ json: {} })
    })
    await page.goto('/admin/salon', { waitUntil: 'networkidle' })
    await page.getByRole('tab', { name: 'Holidays' }).click()
    await page.getByRole('button', { name: /Send notification for holiday: First holiday/ }).click()
    const alert = page.getByRole('alert').filter({ hasText: 'Could not load holidays' })
    await expect(alert).toBeVisible()
    await expect(page.getByRole('row').filter({ hasText: 'First holiday' })).toBeVisible()
    await alert.getByRole('button', { name: 'Try again' }).click()
    await expect(page.getByRole('row').filter({ hasText: 'Recovered holiday' })).toBeVisible()
    expect(reads).toBe(2)
  })
}

for (const bad of ['date', 'sendPush'] as const) {
  test(`initial salon read rejects a holiday with malformed ${bad}`, async ({ page }) => {
    await init(page)
    let lists = 0
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/settings/public') return route.fulfill({ json: [] })
      if (path === '/api/users/profile') return route.fulfill({ json: profile })
      if (path === '/api/salon/list') {
        lists++
        const invalid = bad === 'date' ? { ...holiday('bad', 'Invalid'), date: '2030-02-30' } : { ...holiday('bad', 'Invalid'), sendPush: null }
        return route.fulfill({ json: [lists === 1 ? { ...salon, holidays: [invalid] } : salon] })
      }
      return route.fulfill({ json: {} })
    })
    await page.goto('/admin/salon', { waitUntil: 'networkidle' })
    const alert = page.getByRole('alert').filter({ has: page.getByRole('button', { name: 'Try again' }) })
    await expect(alert).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await alert.getByRole('button', { name: 'Try again' }).click()
    await expect(page.locator('#salon-salon-salon-name-2')).toHaveValue('Fixture salon')
    expect(lists).toBe(2)
  })
}

test('old notification completion does not launch a holiday read after session change', async ({ page }) => {
  await init(page)
  let release!: () => void, started = false, detailReads = 0
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    if (path === '/api/users/profile') return route.fulfill({ json: profile })
    if (path === '/api/salon/list') return route.fulfill({ json: [salon] })
    if (path.endsWith('/send-notification')) { started = true; await gate; return route.fulfill({ json: {} }) }
    if (path === '/api/salon/salon-1') { detailReads++; return route.fulfill({ json: salon }) }
    return route.fulfill({ json: {} })
  })
  try {
    await page.goto('/admin/salon', { waitUntil: 'networkidle' })
    await page.getByRole('tab', { name: 'Holidays' }).click()
    await page.getByRole('button', { name: /Send notification for holiday: First holiday/ }).click()
    await expect.poll(() => started).toBe(true)
    await page.evaluate(() => { localStorage.removeItem('token'); localStorage.setItem('auth-session-revision', 'changed-session') })
    const response = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/send-notification'))
    release(); await response
    await expect(page).toHaveURL(/\/login/)
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    expect(detailReads).toBe(0)
  } finally { release() }
})
