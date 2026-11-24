import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const analytics = {
  fromDate: null, toDate: null,
  user: { id: 'client-one', username: 'client-one', email: null, firstName: 'Fixture', lastName: 'Client', phone: null, isActive: true, createdAt: '2026-01-01T00:00:00Z', userRoles: [] },
  stats: { totalReservations: 2, completedReservations: 2, cancelledReservations: 0, noShowCount: 0, totalSpent: 84, manualEntryCount: 0, manualSpent: 0, avgServiceRating: 5, reviewCount: 2 },
  penalty: { cancellationCount: 0, penaltyUntil: null, isPenalized: false }, topServices: [], manualEntries: [],
  reservations: [1, 2].map(n => ({ id: `reservation-${n}`, reservationDate: '2026-01-15', startTime: '10:00', endTime: '11:00', status: 'COMPLETED', clientNotes: `Reservation note ${n}`, cancelReason: null, cancelledAt: null, service: { id: 'service', name: 'Fixture service', price: 42 } })),
  reviews: [1, 2].map(n => ({ id: `review-${n}`, serviceRating: 5, stylistRating: 4, comment: `Review comment ${n}`, isApproved: true, createdAt: '2026-01-16T12:00:00Z', service: { name: 'Fixture service' } })),
}

for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    for (const kind of ['reservations', 'reviews'] as const) {
      test(`${kind} details have unique contextual names and return focus ${language} ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 })
        await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
        await page.route('**/api/**', route => {
          const path = new URL(route.request().url()).pathname
          if (path === '/api/settings/public') return route.fulfill({ json: [] })
          if (path === '/api/users/profile') return route.fulfill({ json: profile })
          if (path === '/api/users/client-one/analytics') return route.fulfill({ json: analytics })
          if (path === '/api/client-debts') return route.fulfill({ json: [] })
          return route.fulfill({ json: {} })
        })
        await page.goto('/admin/analytics?tab=clients&userId=client-one', { waitUntil: 'networkidle' })
        await expect(page.getByRole('heading', { name: 'Fixture Client' })).toBeVisible()
        if (kind === 'reviews') await page.getByRole('tab', { name: language === 'bs' ? 'Recenzije' : 'Reviews' }).click()
        const actions = kind === 'reservations'
          ? page.getByRole('table').filter({ hasText: 'Fixture service' }).getByRole('button')
          : page.getByRole('button', { name: /Fixture service/ })
        await expect(actions).toHaveCount(2)
        const prefix = kind === 'reservations' ? (language === 'bs' ? 'Detalji' : 'Details') : (language === 'bs' ? 'Otvori detalje recenzije' : 'Open review details')
        for (const index of [0, 1]) {
          const action = actions.nth(index)
          await expect(action).toHaveAccessibleName(new RegExp(`${prefix}.*Fixture service.*2026.*${index + 1}$`, 'i'))
          if (kind === 'reservations') await expect(action).toHaveAccessibleName(/10:00 - 11:00/)
          await action.focus(); await page.keyboard.press('Enter')
          const dialog = page.getByRole('dialog')
          await expect(dialog).toContainText(kind === 'reservations' ? `Reservation note ${index + 1}` : `Review comment ${index + 1}`)
          await page.keyboard.press('Escape')
          await expect(dialog).toBeHidden()
          await expect(action).toBeFocused()
        }
        // The client detail tabs are nested inside the analytics hub tabpanel.
        const activePanel = '[role="tabpanel"][data-state="active"] [role="tabpanel"][data-state="active"]'
        await expect(page.locator(activePanel)).toHaveCount(1)
        const axe = await new AxeBuilder({ page }).include(activePanel).withRules(['button-name', 'label-content-name-mismatch']).analyze()
        expect(axe.violations).toEqual([])
      })
    }
  }
}
