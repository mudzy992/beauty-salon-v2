import { expect, test } from '@playwright/test'

const client = (id: string) => ({ id, username: id, email: `${id}@example.test`, firstName: id, lastName: 'Fixture', phone: null, gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, isActive: true, isAvatarPublic: false, avatar: null, createdAt: '2026-01-01T00:00:00.000Z', roles: ['CLIENT'] })
const item = (id: string) => ({ imageId: `photo-${id}`, entryId: `entry-${id}`, serviceName: 'Synthetic service', serviceDate: '2026-01-02', completedAt: '2026-01-02T10:00:00.000Z', isBefore: true, isAfter: false, description: `Private description ${id}`, previewUrl: '/api/preview-fixture', consentedAt: null, revokedAt: null, isPublished: false, publishedCategories: [] })
const payload = (id: string) => ({ policyVersion: 'policy-v1', consentText: 'Synthetic consent', pending: [item(id)], active: [] })
const deferred = () => {
  let release!: () => void
  const promise = new Promise<void>(resolve => { release = resolve })
  return { promise, release }
}

async function switchIdentity(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    const modulePath = '/src/stores/auth.store.ts'
    const { useAuthStore } = await import(/* @vite-ignore */ modulePath)
    const store = useAuthStore.getState()
    store.replaceToken('token-B')
    store.setUser({ sub: 'client-B', username: 'client-B', email: 'client-B@example.test', phone: null, gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['CLIENT'], avatar: null, isAvatarPublic: false })
  })
}

for (const staleStatus of [201, 401]) {
  test(`identity switch ignores old consent mutation response ${staleStatus}`, async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('token', 'token-A'); localStorage.setItem('APP_LOCALE', 'en') })
    const grantStarted = deferred(), grantGate = deferred()
    await page.route(url => url.pathname.startsWith('/api/'), async route => {
      const req = route.request(), path = new URL(req.url()).pathname
      const id = req.headers().authorization === 'Bearer token-B' ? 'client-B' : 'client-A'
      if (path === '/api/settings/public') return route.fulfill({ json: [] })
      if (path === '/api/users/profile') return route.fulfill({ json: client(id) })
      if (path === '/api/preview-fixture') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>' })
      if (path === '/api/media/consents/me') return route.fulfill({ json: payload(id) })
      if (path === '/api/media/consents/photo-client-A/grant') {
        expect(req.headers().authorization).toBe('Bearer token-A')
        grantStarted.release()
        await grantGate.promise
        return route.fulfill({ status: staleStatus, json: staleStatus === 201 ? { active: true } : {} })
      }
      return route.fulfill({ json: {} })
    })
    try {
      await page.goto('/profil')
      await expect(page.getByText('Private description client-A')).toBeVisible()
      await page.getByRole('checkbox', { name: /I have read the statement/ }).check()
      const response = page.waitForResponse(r => r.url().includes('/api/media/consents/photo-client-A/grant'))
      await page.getByRole('button', { name: 'Give consent' }).click()
      await grantStarted.promise
      await switchIdentity(page)
      await expect(page.getByText('Private description client-B')).toBeVisible()
      await expect(page.getByText('Private description client-A')).toHaveCount(0)
      grantGate.release()
      expect((await response).status()).toBe(staleStatus)
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
      await expect(page.getByText('Private description client-B')).toBeVisible()
      await expect(page.getByText('Private description client-A')).toHaveCount(0)
      await expect(page.getByRole('checkbox', { name: /I have read the statement/ })).not.toBeChecked()
      expect(await page.evaluate(() => localStorage.getItem('token'))).toBe('token-B')
      expect(new URL(page.url()).pathname).toBe('/profil')
    } finally { grantGate.release() }
  })
}

test('late startup profile failure does not log out a newer session', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('token', 'token-A'); localStorage.setItem('APP_LOCALE', 'en') })
  const oldStarted = deferred(), oldGate = deferred()
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const req = route.request(), path = new URL(req.url()).pathname
    const isB = req.headers().authorization === 'Bearer token-B'
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    if (path === '/api/users/profile' && !isB) {
      oldStarted.release()
      await oldGate.promise
      return route.fulfill({ status: 503, json: {} })
    }
    if (path === '/api/users/profile') return route.fulfill({ json: client('client-B') })
    if (path === '/api/media/consents/me') return route.fulfill({ json: payload('client-B') })
    if (path === '/api/preview-fixture') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>' })
    return route.fulfill({ json: {} })
  })
  try {
    await page.goto('/profil', { waitUntil: 'domcontentloaded' })
    await oldStarted.promise
    await switchIdentity(page)
    await expect(page.getByText('Private description client-B')).toBeVisible()
    const oldResponse = page.waitForResponse(r => r.url().endsWith('/api/users/profile') && r.status() === 503)
    oldGate.release()
    expect((await oldResponse).status()).toBe(503)
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    await expect(page.getByText('Private description client-B')).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBe('token-B')
    expect(new URL(page.url()).pathname).toBe('/profil')
  } finally { oldGate.release() }
})

test('a new stylist cannot see the previous stylist cached debt list', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('token', 'token-A'); localStorage.setItem('APP_LOCALE', 'en') })
  const bGate = deferred()
  let bRequests = 0
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const req = route.request(), path = new URL(req.url()).pathname
    const isB = req.headers().authorization === 'Bearer token-B'
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    if (path === '/api/users/profile') return route.fulfill({ json: { ...client(isB ? 'stylist-B' : 'stylist-A'), roles: ['STYLIST'] } })
    if (path === '/api/client-debts/stylist/me') {
      if (isB) { bRequests += 1; await bGate.promise }
      return route.fulfill({ json: [{ id: isB ? 'debt-B' : 'debt-A', amount: 10, createdAt: '2026-01-01', client: { id: 'customer', username: 'customer', firstName: isB ? 'Private B' : 'Private A', lastName: 'Fixture' } }] })
    }
    return route.fulfill({ json: {} })
  })
  try {
    await page.goto('/stylist/debts')
    await expect(page.getByText('Private A Fixture')).toBeVisible()
    await page.evaluate(async () => {
      const modulePath = '/src/stores/auth.store.ts'
      const { useAuthStore } = await import(/* @vite-ignore */ modulePath)
      const store = useAuthStore.getState()
      store.replaceToken('token-B')
      store.setUser({ sub: 'stylist-B', username: 'stylist-B', email: 'stylist-B@example.test', phone: null, gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['STYLIST'], avatar: null, isAvatarPublic: false })
    })
    await expect.poll(() => bRequests).toBeGreaterThan(0)
    await expect(page.getByText('Private A Fixture')).toHaveCount(0)
    bGate.release()
    await expect(page.getByText('Private B Fixture')).toBeVisible()
    await expect(page.getByText('Private A Fixture')).toHaveCount(0)
  } finally { bGate.release() }
})

test('a late previous stylist debt response cannot replace the new stylist list', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('token', 'token-A'); localStorage.setItem('APP_LOCALE', 'en') })
  const oldStarted = deferred(), oldGate = deferred()
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const req = route.request(), path = new URL(req.url()).pathname
    const isB = req.headers().authorization === 'Bearer token-B'
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    if (path === '/api/users/profile') return route.fulfill({ json: { ...client(isB ? 'stylist-B' : 'stylist-A'), roles: ['STYLIST'] } })
    if (path === '/api/client-debts/stylist/me') {
      if (!isB) { oldStarted.release(); await oldGate.promise }
      return route.fulfill({ json: [{ id: isB ? 'debt-B' : 'debt-A', amount: 10, createdAt: '2026-01-01', client: { id: 'customer', username: 'customer', firstName: isB ? 'Private B' : 'Private A', lastName: 'Fixture' } }] })
    }
    return route.fulfill({ json: {} })
  })
  try {
    await page.goto('/stylist/debts')
    await oldStarted.promise
    await page.evaluate(async () => {
      const modulePath = '/src/stores/auth.store.ts'
      const { useAuthStore } = await import(/* @vite-ignore */ modulePath)
      const store = useAuthStore.getState()
      store.replaceToken('token-B')
      store.setUser({ sub: 'stylist-B', username: 'stylist-B', email: 'stylist-B@example.test', phone: null, gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['STYLIST'], avatar: null, isAvatarPublic: false })
    })
    await expect(page.getByText('Private B Fixture')).toBeVisible()
    const oldResponse = page.waitForResponse(r => r.url().includes('/api/client-debts/stylist/me') && r.request().headers().authorization === 'Bearer token-A')
    oldGate.release()
    await oldResponse
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    await expect(page.getByText('Private B Fixture')).toBeVisible()
    await expect(page.getByText('Private A Fixture')).toHaveCount(0)
  } finally { oldGate.release() }
})

test('late password change for the previous identity cannot replace the new session', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('token', 'token-A'); localStorage.setItem('APP_LOCALE', 'en') })
  const started = deferred(), gate = deferred()
  await page.route(url => url.pathname.startsWith('/api/') || url.pathname === '/auth/change-password', async route => {
    const req = route.request(), path = new URL(req.url()).pathname
    if (path === '/auth/change-password') {
      started.release()
      await gate.promise
      return route.fulfill({ json: { access_token: 'changed-token-A' } })
    }
    if (path === '/api/users/profile') {
      const isB = req.headers().authorization === 'Bearer token-B'
      return route.fulfill({ json: { ...client(isB ? 'client-B' : 'client-A'), mustChangePassword: !isB } })
    }
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    return route.fulfill({ json: {} })
  })
  try {
    await page.goto('/force-change-password')
    await page.locator('#currentPassword').fill('old-password')
    await page.locator('#newPassword').fill('new-password')
    await page.locator('#confirmPassword').fill('new-password')
    await page.locator('form').evaluate((form: HTMLFormElement) => form.requestSubmit())
    await started.promise
    await switchIdentity(page)
    const response = page.waitForResponse(r => r.url().includes('/auth/change-password'))
    gate.release()
    await response
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    const state = await page.evaluate(async () => {
      const modulePath = '/src/stores/auth.store.ts'
      const { useAuthStore } = await import(/* @vite-ignore */ modulePath)
      return { token: useAuthStore.getState().token, stored: localStorage.getItem('token'), user: useAuthStore.getState().user?.sub }
    })
    expect(state).toEqual({ token: 'token-B', stored: 'token-B', user: 'client-B' })
  } finally { gate.release() }
})

test('a current password change refreshes its profile and completes onboarding', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('token', 'token-A'); localStorage.setItem('APP_LOCALE', 'en') })
  await page.route(url => url.pathname.startsWith('/api/') || url.pathname === '/auth/change-password', async route => {
    const req = route.request(), path = new URL(req.url()).pathname
    if (path === '/auth/change-password') return route.fulfill({ json: { access_token: 'changed-token-A' } })
    if (path === '/api/users/profile') return route.fulfill({ json: { ...client('client-A'), mustChangePassword: req.headers().authorization !== 'Bearer changed-token-A' } })
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    return route.fulfill({ json: {} })
  })
  await page.goto('/force-change-password')
  await page.locator('#currentPassword').fill('old-password')
  await page.locator('#newPassword').fill('new-password')
  await page.locator('#confirmPassword').fill('new-password')
  await page.locator('form').evaluate((form: HTMLFormElement) => form.requestSubmit())
  await expect(page).toHaveURL('/')
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBe('changed-token-A')
})

test('renewing the same token while startup profile is pending still finishes startup', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('token', 'token-A'); localStorage.setItem('APP_LOCALE', 'en') })
  const started = deferred(), gate = deferred()
  let profileRequests = 0
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/users/profile') {
      profileRequests++
      if (profileRequests <= 2) { if (profileRequests === 2) started.release(); await gate.promise }
      return route.fulfill({ json: client('client-A') })
    }
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    if (path === '/api/media/consents/me') return route.fulfill({ json: payload('client-A') })
    return route.fulfill({ json: {} })
  })
  try {
    await page.goto('/profil')
    await started.promise
    await page.evaluate(async () => {
      const modulePath = '/src/stores/auth.store.ts'
      const { useAuthStore } = await import(/* @vite-ignore */ modulePath)
      useAuthStore.getState().replaceToken('token-A')
    })
    gate.release()
    await expect(page.getByText('Private description client-A')).toBeVisible()
    expect(profileRequests).toBeGreaterThanOrEqual(3)
  } finally { gate.release() }
})

test('same-tab identity change discards the previous stylist private booking form', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('token', 'token-A'); localStorage.setItem('APP_LOCALE', 'en') })
  await page.route(url => url.pathname.startsWith('/api/') || url.pathname === '/auth/login', async route => {
    const path = new URL(route.request().url()).pathname
    const isB = route.request().headers().authorization === 'Bearer token-B'
    if (path === '/auth/login') return route.fulfill({ json: { access_token: 'token-B', user: { ...client('stylist-B'), roles: ['STYLIST'] } } })
    if (path === '/api/users/profile') return route.fulfill({ json: { ...client(isB ? 'stylist-B' : 'stylist-A'), roles: ['STYLIST'] } })
    if (path === '/api/users/clients') return route.fulfill({ json: { items: [{ id: 'customer-A', username: 'customer-A', firstName: 'Private', lastName: 'Customer A', gender: 'FEMALE' }] } })
    if (path === '/api/services' || path === '/api/settings/public') return route.fulfill({ json: [] })
    return route.fulfill({ json: {} })
  })
  await page.goto('/stylist/schedule/new')
  const search = page.locator('#stylist-direct-booking-client')
  await search.fill('Private')
  await page.getByRole('button', { name: /Private Customer A/ }).click()
  await expect(search).toHaveValue('Private Customer A')
  await page.evaluate(async () => {
    const modulePath = '/src/stores/auth.store.ts'
    const { useAuthStore } = await import(/* @vite-ignore */ modulePath)
    await useAuthStore.getState().login('stylist-B', 'synthetic')
  })
  await expect(search).toHaveValue('')
  await expect(page.getByText('Private Customer A')).toHaveCount(0)
})

test('same-tab identity change closes the previous client reservation dialog', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('token', 'token-A'); localStorage.setItem('APP_LOCALE', 'en') })
  await page.route(url => url.pathname.startsWith('/api/') || url.pathname === '/auth/login', async route => {
    const path = new URL(route.request().url()).pathname
    const isB = route.request().headers().authorization === 'Bearer token-B'
    if (path === '/auth/login') return route.fulfill({ json: { access_token: 'token-B', user: client('client-B') } })
    if (path === '/api/users/profile') return route.fulfill({ json: client(isB ? 'client-B' : 'client-A') })
    if (path === '/api/reservations') return route.fulfill({ json: { items: isB ? [] : [{ id: 'reservation-A', reservationDate: '2099-03-02', startTime: '09:00', endTime: '10:00', status: 'CONFIRMED', clientNotes: 'Private note A', publicReferenceCode: 'PRIVATE-A', service: { id: 's', name: 'Private service A', durationMinutes: 60 } }], total: isB ? 0 : 1, page: 0, pageSize: 50 } })
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    return route.fulfill({ json: {} })
  })
  await page.goto('/moje-rezervacije')
  await expect(page.getByText('PRIVATE-A')).toBeVisible()
  await page.getByRole('button', { name: /cancel reservation —/i }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.locator('#cancel-reason').fill('Private reason A')
  await page.evaluate(async () => {
    const modulePath = '/src/stores/auth.store.ts'
    const { useAuthStore } = await import(/* @vite-ignore */ modulePath)
    await useAuthStore.getState().login('client-B', 'synthetic')
  })
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText('PRIVATE-A')).toHaveCount(0)
})

test('late direct booking success cannot navigate the new stylist away', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('token', 'token-A'); localStorage.setItem('APP_LOCALE', 'en') })
  const started = deferred(), gate = deferred()
  await page.route(url => url.pathname.startsWith('/api/') || url.pathname === '/auth/login', async route => {
    const path = new URL(route.request().url()).pathname
    const isB = route.request().headers().authorization === 'Bearer token-B'
    if (path === '/auth/login') return route.fulfill({ json: { access_token: 'token-B', user: { ...client('stylist-B'), roles: ['STYLIST'] } } })
    if (path === '/api/users/profile') return route.fulfill({ json: { ...client(isB ? 'stylist-B' : 'stylist-A'), roles: ['STYLIST'] } })
    if (path === '/api/users/clients') return route.fulfill({ json: { items: [{ id: 'customer-A', username: 'customer-A', firstName: 'Private', lastName: 'Customer A', gender: 'FEMALE' }] } })
    if (path === '/api/services') return route.fulfill({ json: [{ id: 'service-A', name: 'Synthetic service', gender: 'FEMALE', price: 10, durationMinutes: 60 }] })
    if (path === '/api/reservations/stylist/direct') { started.release(); await gate.promise; return route.fulfill({ status: 201, json: {} }) }
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    return route.fulfill({ json: {} })
  })
  try {
    await page.goto('/stylist/schedule/new')
    await page.locator('#stylist-direct-booking-client').fill('Private')
    await page.getByRole('button', { name: /Private Customer A/ }).click()
    await page.getByRole('button', { name: /Synthetic service/ }).click()
    await page.getByRole('button', { name: 'Create appointment' }).click()
    await started.promise
    await page.evaluate(async () => {
      const modulePath = '/src/stores/auth.store.ts'
      const { useAuthStore } = await import(/* @vite-ignore */ modulePath)
      await useAuthStore.getState().login('stylist-B', 'synthetic')
    })
    await expect(page.locator('#stylist-direct-booking-client')).toHaveValue('')
    const response = page.waitForResponse(r => r.url().includes('/api/reservations/stylist/direct'))
    gate.release()
    await response
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    expect(new URL(page.url()).pathname).toBe('/stylist/schedule/new')
  } finally { gate.release() }
})

test('current stylist direct booking succeeds and navigates to the schedule', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('token', 'token-A'); localStorage.setItem('APP_LOCALE', 'en') })
  let writes = 0
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/users/profile') return route.fulfill({ json: { ...client('stylist-A'), roles: ['STYLIST'] } })
    if (path === '/api/users/clients') return route.fulfill({ json: { items: [{ id: 'customer-A', username: 'customer-A', firstName: 'Private', lastName: 'Customer A', gender: 'FEMALE' }] } })
    if (path === '/api/services') return route.fulfill({ json: [{ id: 'service-A', name: 'Synthetic service', gender: 'FEMALE', price: 10, durationMinutes: 60 }] })
    if (path === '/api/reservations/stylist/direct') { writes++; return route.fulfill({ status: 201, json: {} }) }
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    return route.fulfill({ json: {} })
  })
  await page.goto('/stylist/schedule/new')
  await page.locator('#stylist-direct-booking-client').fill('Private')
  await page.getByRole('button', { name: /Private Customer A/ }).click()
  await page.getByRole('button', { name: /Synthetic service/ }).click()
  await page.getByRole('button', { name: 'Create appointment' }).click()
  await expect(page).toHaveURL(/\/stylist\/schedule$/)
  expect(writes).toBe(1)
})

test('a previous client booking form and late submission do not affect the next client', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('token', 'token-A'); localStorage.setItem('APP_LOCALE', 'en') })
  const started = deferred(), gate = deferred()
  await page.route(url => url.pathname.startsWith('/api/') || url.pathname === '/auth/login', async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname
    const isB = req.headers().authorization === 'Bearer token-B'
    if (path === '/auth/login') return route.fulfill({ json: { access_token: 'token-B', user: { ...client('client-B'), phone: '123' } } })
    if (path === '/api/users/profile') return route.fulfill({ json: { ...client(isB ? 'client-B' : 'client-A'), phone: '123' } })
    if (path === '/api/services') return route.fulfill({ json: [{ id: 'service-A', name: 'Synthetic service', gender: 'FEMALE', price: 10, durationMinutes: 60 }] })
    if (path === '/api/reservations/availability/dates') return route.fulfill({ json: [{ date: url.searchParams.get('fromDate'), available: true }] })
    if (path === '/api/reservations/availability/slots') return route.fulfill({ json: [{ startTime: '23:59', endTime: '23:59', availableStylistCount: 1 }] })
    if (path === '/api/reservations' && req.method() === 'POST') { started.release(); await gate.promise; return route.fulfill({ status: 201, json: {} }) }
    if (path === '/api/client-debts/me' || path === '/api/settings/public') return route.fulfill({ json: [] })
    if (path === '/api/loyalty/client/me') return route.fulfill({ json: { enabled: false, hasAccount: false } })
    return route.fulfill({ json: {} })
  })
  try {
    await page.goto('/rezervacija')
    await page.locator('#public-service-search').fill('Synthetic')
    await page.getByRole('button', { name: /^Synthetic service/ }).click()
    await page.locator('[data-reserve-calendar] button[aria-pressed="false"]:not([disabled])').click()
    await page.locator('[data-reserve-slot]').filter({ hasText: '23:59' }).click()
    await page.locator('#reservation-notes').fill('Private note A')
    await page.getByRole('button', { name: 'Submit reservation' }).click()
    await started.promise
    await page.evaluate(async () => {
      const modulePath = '/src/stores/auth.store.ts'
      const { useAuthStore } = await import(/* @vite-ignore */ modulePath)
      await useAuthStore.getState().login('client-B', 'synthetic')
    })
    await expect(page.locator('#reservation-notes')).toHaveCount(0)
    await expect(page.locator('[data-reserve-selected-item]')).toHaveCount(0)
    const response = page.waitForResponse(r => r.url().endsWith('/api/reservations') && r.request().method() === 'POST')
    gate.release()
    await response
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    expect(new URL(page.url()).pathname).toBe('/rezervacija')
  } finally { gate.release() }
})

test('current client can submit a reservation and reach the reservations page', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('token', 'token-A'); localStorage.setItem('APP_LOCALE', 'en') })
  let writes = 0
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname
    if (path === '/api/users/profile') return route.fulfill({ json: { ...client('client-A'), phone: '123' } })
    if (path === '/api/services') return route.fulfill({ json: [{ id: 'service-A', name: 'Synthetic service', gender: 'FEMALE', price: 10, durationMinutes: 60 }] })
    if (path === '/api/reservations/availability/dates') return route.fulfill({ json: [{ date: url.searchParams.get('fromDate'), available: true }] })
    if (path === '/api/reservations/availability/slots') return route.fulfill({ json: [{ startTime: '23:59', endTime: '23:59', availableStylistCount: 1 }] })
    if (path === '/api/reservations' && req.method() === 'POST') { writes++; return route.fulfill({ status: 201, json: {} }) }
    if (path === '/api/reservations') return route.fulfill({ json: { items: [], total: 0, page: 0, pageSize: 50 } })
    if (path === '/api/client-debts/me' || path === '/api/settings/public') return route.fulfill({ json: [] })
    if (path === '/api/loyalty/client/me') return route.fulfill({ json: { enabled: false, hasAccount: false } })
    return route.fulfill({ json: {} })
  })
  await page.goto('/rezervacija')
  await page.locator('#public-service-search').fill('Synthetic')
  await page.getByRole('button', { name: /^Synthetic service/ }).click()
  await page.locator('[data-reserve-calendar] button[aria-pressed="false"]:not([disabled])').click()
  await page.locator('[data-reserve-slot]').filter({ hasText: '23:59' }).click()
  await page.locator('#reservation-notes').fill('Fixture note')
  await page.getByRole('button', { name: 'Submit reservation' }).click()
  await expect(page).toHaveURL(/\/moje-rezervacije$/)
  expect(writes).toBe(1)
})

test('blog comment drafts and late submission cannot cross an identity switch', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('token', 'token-A'); localStorage.setItem('APP_LOCALE', 'en') })
  const started = deferred(), gate = deferred()
  await page.route(url => url.pathname.startsWith('/api/') || url.pathname === '/auth/login', async route => {
    const req = route.request(), path = new URL(req.url()).pathname
    const isB = req.headers().authorization === 'Bearer token-B'
    if (path === '/auth/login') return route.fulfill({ json: { access_token: 'token-B', user: client('client-B') } })
    if (path === '/api/users/profile') return route.fulfill({ json: client(isB ? 'client-B' : 'client-A') })
    if (path === '/api/blog/slug/test-article') return route.fulfill({ json: { id: 'article-1', slug: 'test-article', title: 'Synthetic article', content: '<p>Article</p>', publishedAt: '2025-01-01T12:00:00Z' } })
    if (path === '/api/blog/article-1/comments' && req.method() === 'POST') { started.release(); await gate.promise; return route.fulfill({ status: 201, json: {} }) }
    if (path === '/api/blog/article-1/comments' || path === '/api/settings/public') return route.fulfill({ json: [] })
    return route.fulfill({ json: {} })
  })
  try {
    await page.goto('/blog/test-article')
    const comment = page.locator('#public-blog-comment')
    await comment.fill('Private draft A')
    await page.getByRole('button', { name: 'Post comment' }).click()
    await started.promise
    await page.evaluate(async () => {
      const modulePath = '/src/stores/auth.store.ts'
      const { useAuthStore } = await import(/* @vite-ignore */ modulePath)
      await useAuthStore.getState().login('client-B', 'synthetic')
    })
    await expect(comment).toHaveValue('')
    await comment.fill('Private draft B')
    const response = page.waitForResponse(r => r.url().includes('/api/blog/article-1/comments') && r.request().method() === 'POST')
    gate.release()
    await response
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    await expect(comment).toHaveValue('Private draft B')
  } finally { gate.release() }
})

test('a current user can submit a blog comment normally', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('token', 'token-A'); localStorage.setItem('APP_LOCALE', 'en') })
  let writes = 0
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const req = route.request(), path = new URL(req.url()).pathname
    if (path === '/api/users/profile') return route.fulfill({ json: client('client-A') })
    if (path === '/api/blog/slug/test-article') return route.fulfill({ json: { id: 'article-1', slug: 'test-article', title: 'Synthetic article', content: '<p>Article</p>', publishedAt: '2025-01-01T12:00:00Z' } })
    if (path === '/api/blog/article-1/comments' && req.method() === 'POST') { writes++; expect(req.postDataJSON()).toEqual({ content: 'Synthetic comment' }); return route.fulfill({ status: 201, json: {} }) }
    if (path === '/api/blog/article-1/comments' || path === '/api/settings/public') return route.fulfill({ json: [] })
    return route.fulfill({ json: {} })
  })
  await page.goto('/blog/test-article')
  await page.locator('#public-blog-comment').fill('Synthetic comment')
  await page.getByRole('button', { name: 'Post comment' }).click()
  await expect(page.locator('#public-blog-comment')).toHaveValue('')
  expect(writes).toBe(1)
})
