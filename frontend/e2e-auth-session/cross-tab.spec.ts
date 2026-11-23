import { expect, test } from '@playwright/test'

const profile = (id: string) => ({ id, username: id, email: `${id}@example.test`, phone: null, gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['STYLIST'], avatar: null, isAvatarPublic: false })
const debt = (id: string) => [{ id: `debt-${id}`, amount: 10, createdAt: '2026-01-01', client: { id: 'customer', username: 'customer', firstName: `Private ${id}`, lastName: 'Fixture' } }]
const deferred = () => {
  let release!: () => void
  const promise = new Promise<void>(resolve => { release = resolve })
  return { promise, release }
}

async function getSession(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const path = '/src/stores/auth.store.ts'
    const { useAuthStore } = await import(/* @vite-ignore */ path)
    const { token, user, isReady } = useAuthStore.getState()
    return { token, user: user?.sub ?? null, isReady }
  })
}

async function initialize(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.evaluate(() => { localStorage.setItem('token', 'token-A'); localStorage.setItem('APP_LOCALE', 'en') })
  await page.goto('/stylist/debts')
  await expect(page.getByText('Private A Fixture')).toBeVisible()
}

test('another tab hides A while the new B session is verified', async ({ page, context }) => {
  const gate = deferred()
  let bProfiles = 0
  await context.route(url => url.pathname.startsWith('/api/') || url.pathname === '/auth/login', async route => {
    const path = new URL(route.request().url()).pathname
    const isB = route.request().headers().authorization === 'Bearer token-B'
    if (path === '/auth/login') return route.fulfill({ json: { access_token: 'token-B', user: profile('stylist-B') } })
    if (path === '/api/users/profile') {
      if (isB) { bProfiles++; await gate.promise }
      return route.fulfill({ json: profile(isB ? 'stylist-B' : 'stylist-A') })
    }
    if (path === '/api/client-debts/stylist/me') return route.fulfill({ json: debt(isB ? 'B' : 'A') })
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    return route.fulfill({ json: {} })
  })
  try {
    await initialize(page)
    const second = await context.newPage()
    await second.goto('/stylist/debts')
    await expect(second.getByText('Private A Fixture')).toBeVisible()
    await page.evaluate(async () => {
      const path = '/src/stores/auth.store.ts'
      const { useAuthStore } = await import(/* @vite-ignore */ path)
      await useAuthStore.getState().login('stylist-B', 'synthetic')
    })
    await expect.poll(async () => (await getSession(second)).token).toBe('token-B')
    await expect.poll(() => bProfiles).toBeGreaterThan(0)
    await expect(second.getByText('Private A Fixture')).toHaveCount(0)
    expect(await getSession(second)).toEqual({ token: 'token-B', user: null, isReady: false })
    gate.release()
    await expect(second.getByText('Private B Fixture')).toBeVisible()
    expect((await getSession(second)).user).toBe('stylist-B')
  } finally { gate.release() }
})

test('logout in another tab removes the protected content and invalidates the session', async ({ page, context }) => {
  await context.route(url => url.pathname.startsWith('/api/'), async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/users/profile') return route.fulfill({ json: profile('stylist-A') })
    if (path === '/api/client-debts/stylist/me') return route.fulfill({ json: debt('A') })
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    return route.fulfill({ json: {} })
  })
  await initialize(page)
  const second = await context.newPage()
  await second.goto('/stylist/debts')
  await expect(second.getByText('Private A Fixture')).toBeVisible()
  await page.evaluate(async () => {
    const path = '/src/stores/auth.store.ts'
    const { useAuthStore } = await import(/* @vite-ignore */ path)
    useAuthStore.getState().logout()
  }).catch(() => {})
  await expect(second).toHaveURL(/\/login/)
  await expect(second.getByText('Private A Fixture')).toHaveCount(0)
  expect(await getSession(second)).toEqual({ token: null, user: null, isReady: true })
})

for (const oldStatus of [200, 401]) {
  test(`another tab ignores an old debt response ${oldStatus} after switching identity`, async ({ page, context }) => {
    await context.route(url => url.pathname.startsWith('/api/') || url.pathname === '/auth/login', async route => {
      const path = new URL(route.request().url()).pathname
      const isB = route.request().headers().authorization === 'Bearer token-B'
      if (path === '/auth/login') return route.fulfill({ json: { access_token: 'token-B', user: profile('stylist-B') } })
      if (path === '/api/users/profile') return route.fulfill({ json: profile(isB ? 'stylist-B' : 'stylist-A') })
      if (path === '/api/client-debts/stylist/me') return route.fulfill({ json: debt(isB ? 'B' : 'A') })
      if (path === '/api/settings/public') return route.fulfill({ json: [] })
      return route.fulfill({ json: {} })
    })
    const started = deferred(), gate = deferred()
    try {
      await initialize(page)
      const second = await context.newPage()
      await second.route(url => url.pathname === '/api/client-debts/stylist/me', async route => {
        if (route.request().headers().authorization !== 'Bearer token-A') return route.fallback()
        started.release()
        await gate.promise
        return route.fulfill({ status: oldStatus, json: oldStatus === 200 ? debt('A') : { message: 'Unauthorized' } })
      })
      await second.goto('/stylist/debts')
      await started.promise
      await page.evaluate(async () => {
        const path = '/src/stores/auth.store.ts'
        const { useAuthStore } = await import(/* @vite-ignore */ path)
        await useAuthStore.getState().login('stylist-B', 'synthetic')
      })
      await expect(second.getByText('Private B Fixture')).toBeVisible()
      const response = second.waitForResponse(r => r.url().includes('/api/client-debts/stylist/me') && r.request().headers().authorization === 'Bearer token-A')
      gate.release()
      expect((await response).status()).toBe(oldStatus)
      await second.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
      await expect(second.getByText('Private B Fixture')).toBeVisible()
      await expect(second.getByText('Private A Fixture')).toHaveCount(0)
      expect(await getSession(second)).toEqual({ token: 'token-B', user: 'stylist-B', isReady: true })
      expect(await second.evaluate(() => localStorage.getItem('token'))).toBe('token-B')
    } finally { gate.release() }
  })
}

test('same-token renewal in another tab invalidates the previous session and its cache', async ({ page, context }) => {
  const gate = deferred()
  let renewed = false, refreshes = 0
  await context.route(url => url.pathname.startsWith('/api/') || url.pathname === '/auth/login', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/auth/login') { renewed = true; return route.fulfill({ json: { access_token: 'token-A', user: profile('stylist-A') } }) }
    if (path === '/api/users/profile') {
      if (renewed) { refreshes++; await gate.promise }
      return route.fulfill({ json: profile('stylist-A') })
    }
    if (path === '/api/client-debts/stylist/me') return route.fulfill({ json: debt(renewed ? 'Renewed' : 'A') })
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    return route.fulfill({ json: {} })
  })
  try {
    await initialize(page)
    const second = await context.newPage()
    await second.goto('/stylist/debts')
    await expect(second.getByText('Private A Fixture')).toBeVisible()
    await page.evaluate(async () => {
      const path = '/src/stores/auth.store.ts'
      const { useAuthStore } = await import(/* @vite-ignore */ path)
      await useAuthStore.getState().login('stylist-A', 'synthetic')
    })
    await expect.poll(async () => (await getSession(second)).isReady).toBe(false)
    expect(await getSession(second)).toEqual({ token: 'token-A', user: null, isReady: false })
    await expect(second.getByText('Private A Fixture')).toHaveCount(0)
    gate.release()
    await expect(second.getByText('Private Renewed Fixture')).toBeVisible()
    expect(refreshes).toBeGreaterThan(0)
  } finally { gate.release() }
})
