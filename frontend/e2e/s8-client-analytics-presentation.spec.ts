import { expect, test } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const baseReservation = { reservationDate: '2026-01-15T00:00:00.000Z', startTime: '10:00', endTime: '11:00', clientNotes: null, cancelReason: null, cancelledAt: null, service: { id: 'service', name: 'Fixture service', price: 42 }, confirmedStylist: { user: { firstName: null, lastName: null, username: 'fallback.stylist' } } }
const data = {
  fromDate: null, toDate: null,
  user: { id: 'client-one', username: 'fallback.client', email: null, firstName: null, lastName: null, phone: null, isActive: true, createdAt: 'invalid', userRoles: [] },
  stats: { totalReservations: 2, completedReservations: 1, cancelledReservations: 0, noShowCount: 0, totalSpent: 84, manualEntryCount: 0, manualSpent: 0, avgServiceRating: 5, reviewCount: 1 },
  penalty: { cancellationCount: 0, penaltyUntil: null, isPenalized: false }, topServices: [], manualEntries: [],
  reservations: [{ ...baseReservation, id: 'r1', status: 'COMPLETED' }, { ...baseReservation, id: 'r2', status: 'FUTURE_UNKNOWN' }],
  reviews: [{ id: 'review', serviceRating: 5, stylistRating: null, comment: 'Fixture review', isApproved: true, createdAt: 'invalid', service: { name: 'Fixture service' } }],
}

for (const timezoneId of ['Europe/Sarajevo', 'America/Los_Angeles']) {
  test.describe(timezoneId, () => {
    test.use({ timezoneId })
    for (const width of [320, 1280]) {
      test(`client presentation responds to locale without changing the calendar day ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 })
        await page.addInitScript(() => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', 'en') })
        let analyticsReads = 0
        await page.route('**/api/**', route => {
          const path = new URL(route.request().url()).pathname
          if (path === '/api/settings/public') return route.fulfill({ json: [] })
          if (path === '/api/users/profile') return route.fulfill({ json: profile })
          if (path === '/api/users/client-one/analytics') { analyticsReads++; return route.fulfill({ json: data }) }
          if (path === '/api/client-debts') return route.fulfill({ json: [] })
          return route.fulfill({ json: {} })
        })
        await page.goto('/admin/analytics?tab=clients&userId=client-one', { waitUntil: 'networkidle' })
        await expect(page.getByRole('heading', { name: 'fallback.client' })).toBeVisible()
        const rows = page.getByRole('row').filter({ hasText: 'Fixture service' })
        const expected = await page.evaluate(() => Object.fromEntries(['en-GB', 'bs-BA'].map(locale => [locale, new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC', calendar: 'gregory', numberingSystem: 'latn' }).format(new Date('2026-01-15T12:00:00Z'))])))
        await expect(rows).toHaveCount(2)
        await expect(rows.first()).toContainText(expected['en-GB'])
        await expect(rows.first()).toContainText('fallback.stylist')
        await expect(rows.first()).toContainText('Completed')
        await expect(rows.nth(1)).toContainText('FUTURE_UNKNOWN')
        expect(await rows.first().getByRole('button').getAttribute('aria-label')).toContain(expected['en-GB'])
        await page.getByRole('button', { name: /^EN — Switch language to Bosnian/ }).click()
        await expect(rows.first()).toContainText(expected['bs-BA'])
        await expect(rows.first()).toContainText('Završena')
        await expect(rows.nth(1)).toContainText('FUTURE_UNKNOWN')
        expect(await rows.first().getByRole('button').getAttribute('aria-label')).toContain(expected['bs-BA'])
        await page.getByRole('tab', { name: /Recenzije/ }).click()
        const review = page.getByRole('button', { name: /Otvori detalje recenzije.*Fixture service.*—/ })
        await expect(review).toBeVisible()
        await review.click()
        const dialog = page.getByRole('dialog')
        await expect(dialog).toContainText('Fixture review')
        await expect(dialog).toContainText('—')
        await page.keyboard.press('Escape')
        await expect(review).toBeFocused()
        expect(analyticsReads).toBe(1)
      })
    }
  })
}
