import { expect, test, type Page } from '@playwright/test'

/**
 * S8 — admin bočna traka (2026-11-18).
 *
 * Vlasnikova prijava: „pod grupom analitike imamo klijent otvara nam /users
 * korisnike". Uzrok: tab „Klijenti" (`/admin/analytics?tab=clients`) je bez
 * `?userId=` redirectovao na `/admin/users`, a traka je uz to duplirala tri
 * analitička pod-pogleda koja postoje i kao tabovi u hub-u.
 *
 * Ovaj spec zaključava:
 *  1. svaka stavka trake otvara SVOJE područje (URL + `aria-current` + naziv u
 *     zaglavlju), i
 *  2. analitički tabovi „Klijenti" i „Stilisti" imaju vlastiti izbor i NISU
 *     mrtve granice ka `/admin/users` i `/admin/stylists`.
 *
 * Svi podaci su sintetički (mock); ovo NIJE dokaz stvarnog backenda ni AT audita.
 */

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }

const clientRow = {
  id: 'client-one', username: 'sample.client', email: 'sample@example.test',
  firstName: 'Sample', lastName: 'Client', phone: null,
  gender: 'FEMALE', avatar: null, isActive: true, isEmailVerified: true, createdAt: '2026-01-01T00:00:00Z',
  userRoles: [{ role: { name: 'CLIENT' } }],
}

const stylistRow = {
  id: 'stylist-one', userId: 'user-stylist', specialization: 'Colour', status: 'ACTIVE',
  isActive: true, hireDate: null,
  user: { username: 'sample.stylist', email: 'stylist@example.test', firstName: 'Sample', lastName: 'Stylist' },
}

const clientAnalytics = {
  fromDate: null, toDate: null,
  user: {
    id: 'client-one', username: 'sample.client', email: 'sample@example.test',
    firstName: 'Sample', lastName: 'Client', phone: null, isActive: true, createdAt: '2026-01-01T00:00:00Z',
  },
  stats: {
    totalReservations: 1, completedReservations: 1, cancelledReservations: 0, noShowCount: 0,
    totalSpent: 42, manualEntryCount: 0, manualSpent: 0, avgServiceRating: 5, reviewCount: 1,
  },
  penalty: { cancellationCount: 0, penaltyUntil: null, isPenalized: false },
  topServices: [], reservations: [], reviews: [], manualEntries: [],
}

const stylistAnalytics = {
  stylist: { id: 'stylist-one', name: 'Sample Stylist' },
  topServices: [], recentEntries: [], completedCount: 0, revenue: 0, tips: 0,
}

const mockAdminApi = async (page: Page) => {
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url())
    const path = url.pathname
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    if (path === '/api/users/profile') return route.fulfill({ json: profile })
    if (path === '/api/users/clients/admin') {
      return route.fulfill({ json: { items: [clientRow], total: 1, page: 0, pageSize: 20 } })
    }
    if (path === '/api/stylists/admin') {
      return route.fulfill({ json: { items: [stylistRow], total: 1, page: 0, pageSize: 20 } })
    }
    if (path === '/api/users/client-one/analytics') return route.fulfill({ json: clientAnalytics })
    if (path === '/api/stylists/stylist-one/analytics') return route.fulfill({ json: stylistAnalytics })
    if (path === '/api/client-debts') return route.fulfill({ json: [] })
    if (path === '/api/users/system-admins' || path === '/api/users/stylists' || path === '/api/users/password-reset-candidates') {
      return route.fulfill({ json: [] })
    }
    return route.fulfill({ json: {} })
  })
}

/** Svako admin područje i putanja koju otvara. */
const AREAS = [
  '/admin',
  '/admin/analytics',
  '/admin/reservations',
  '/admin/daily-log',
  '/admin/finance',
  '/admin/loyalty',
  '/admin/salon',
  '/admin/services',
  '/admin/users',
  '/admin/stylists',
  '/admin/blog',
  '/admin/gallery',
  '/admin/reviews',
  '/admin/settings',
]

for (const language of ['bs', 'en'] as const) {
  test(`sidebar opens its own area for every entry ${language}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.addInitScript(lang => {
      localStorage.setItem('token', 'fixture-admin-token')
      localStorage.setItem('APP_LOCALE', lang)
    }, language)
    await mockAdminApi(page)
    await page.goto('/admin', { waitUntil: 'networkidle' })

    const nav = page.locator('[data-admin-sidebar] [data-admin-navigation]')
    const links = nav.locator('a')
    await expect(links).toHaveCount(AREAS.length)

    // Nijedna stavka ne nosi `?tab=` (pod-pogledi žive u hub-ovima) i nijedne
    // dvije stavke ne dijele isti href.
    await expect(nav.locator('a[href*="tab="]')).toHaveCount(0)
    const hrefs = await links.evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))
    expect(new Set(hrefs).size).toBe(hrefs.length)
    expect([...hrefs].sort()).toEqual([...AREAS].sort())

    for (const area of AREAS) {
      const link = nav.locator(`a[href="${area}"]`)
      await expect(link).toHaveCount(1)
      const label = (await link.innerText()).trim()
      await link.click()
      await expect.poll(() => new URL(page.url()).pathname).toBe(area)
      await expect(link).toHaveAttribute('aria-current', 'page')
      // Zaglavlje imenuje otvoreno područje — dokaz da link NE vodi na drugo.
      await expect(page.locator('[data-admin-current-label]')).toHaveText(label)
    }
  })

  test(`analytics client and stylist tabs are self-sufficient ${language}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.addInitScript(lang => {
      localStorage.setItem('token', 'fixture-admin-token')
      localStorage.setItem('APP_LOCALE', lang)
    }, language)
    await mockAdminApi(page)

    await page.goto('/admin/analytics?tab=clients', { waitUntil: 'networkidle' })
    // Tab „Klijenti" prikazuje listu klijenata, a NE redirect na /admin/users.
    await expect(page.locator('[data-client-picker]')).toBeVisible()
    await expect.poll(() => new URL(page.url()).pathname).toBe('/admin/analytics')
    await expect(page).not.toHaveURL(/\/admin\/users/)

    await page.locator('[data-client-picker-list]').getByRole('link').first().click()
    await expect.poll(() => new URL(page.url()).searchParams.get('userId')).toBe('client-one')
    await expect(page.getByRole('heading', { name: /Sample Client/i })).toBeVisible()

    await page.goto('/admin/analytics?tab=stylists', { waitUntil: 'networkidle' })
    await expect(page.locator('[data-stylist-picker]')).toBeVisible()
    await expect(page).not.toHaveURL(/\/admin\/stylists/)
    await page.locator('[data-stylist-picker-list]').getByRole('link').first().click()
    await expect.poll(() => new URL(page.url()).searchParams.get('stylistId')).toBe('stylist-one')
    await expect(page.getByRole('heading', { name: /Sample Stylist/i })).toBeVisible()
  })
}
