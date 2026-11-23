import { expect, test } from '@playwright/test'

for (const oldStatus of [200, 500]) {
  test(`stale stylist removal preview ${oldStatus} cannot replace a later dialog`, async ({ page }) => {
    let release!: () => void, started = false
    const gate = new Promise<void>(resolve => { release = resolve })
    const users = ['first', 'second'].map((username) => ({ id: username, username, email: null, firstName: username, lastName: 'Fixture', phone: null, gender: 'FEMALE', avatar: null, isActive: true, isEmailVerified: true, userRoles: [{ role: { name: 'CLIENT' } }, { role: { name: 'STYLIST' } }], stylistProfile: { id: `stylist-${username}`, status: 'ACTIVE' } }))
    const preview = (id: string) => ({ stylistProfileId: `stylist-${id}`, revision: (id === 'first' ? 'a' : 'b').repeat(64), financial: { clientDebtsCount: 0, manualIncomeCount: 0, bookedDailyLogsCount: 0 }, counts: { dailyLogEntriesCount: 0, confirmedReservationsCount: 0, reservationResponsesCount: 0, reviewsCount: 0 } })
    const writes: Array<{ path: string; body: { previewRevision: string } }> = []
    await page.addInitScript(() => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', 'en') })
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname
      if (route.request().method() === 'POST') { writes.push({ path, body: route.request().postDataJSON() }); return route.fulfill({ json: {} }) }
      if (path === '/api/settings/public') return route.fulfill({ json: [] })
      if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
      if (path === '/api/users/clients/admin') return route.fulfill({ json: { items: users, total: 2, page: 0, pageSize: 20 } })
      if (path === '/api/users/system-admins' || path === '/api/users/stylists' || path === '/api/users/password-reset-candidates') return route.fulfill({ json: [] })
      if (path === '/api/users/first/stylist-removal-preview') {
        started = true
        await gate
        return oldStatus === 200 ? route.fulfill({ json: preview('first') }) : route.fulfill({ status: 500, json: {} })
      }
      if (path === '/api/users/second/stylist-removal-preview') return route.fulfill({ json: preview('second') })
      return route.fulfill({ json: {} })
    })
    try {
      await page.goto('/admin/users', { waitUntil: 'networkidle' })
      await page.getByRole('button', { name: 'Remove Stylist role from first' }).click()
      await expect.poll(() => started).toBe(true)
      let dialog = page.getByRole('dialog', { name: 'Remove stylist role' })
      await expect(dialog.getByRole('status')).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      await page.getByRole('button', { name: 'Remove Stylist role from second' }).click()
      dialog = page.getByRole('dialog', { name: 'Remove stylist role' })
      await expect(dialog).toContainText('Stylist: second')
      const response = page.waitForResponse(r => r.url().includes('/first/stylist-removal-preview'))
      release()
      await response
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
      await expect(dialog).toBeVisible()
      await expect(dialog).toContainText('Stylist: second')
      const confirm = dialog.getByRole('button', { name: 'Remove stylist role', exact: true })
      await expect(confirm).toBeEnabled()
      await expect(page.locator('[data-sonner-toast]')).toHaveCount(0)
      await confirm.click()
      await expect.poll(() => writes.length).toBe(1)
      expect(writes[0].path).toBe('/api/users/second/remove-stylist-role')
      expect(writes[0].body.previewRevision).toBe('b'.repeat(64))
    } finally { release() }
  })
}
