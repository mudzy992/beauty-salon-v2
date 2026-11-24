import { expect, test } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const user = { id: 'client-1', username: 'sample.client', email: 'sample@example.test', firstName: 'Sample', lastName: 'Client', phone: null, gender: 'FEMALE', avatar: null, isActive: true, isEmailVerified: true, mustChangePassword: true, createdAt: '2026-01-01T00:00:00Z', userRoles: [{ role: { name: 'CLIENT' } }, { role: { name: 'OWNER' } }] }
for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`user dialogs restore their clicked opener without pointer focus ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
      const writes: string[] = []
      await page.route(/\/(api|auth)\//, route => {
        const req = route.request(), path = new URL(req.url()).pathname
        if (req.method() !== 'GET') { writes.push(path); return route.fulfill({ json: {} }) }
        if (path === '/api/settings/public') return route.fulfill({ json: [] })
        if (path === '/api/users/profile') return route.fulfill({ json: profile })
        if (path === '/api/users/clients/admin') return route.fulfill({ json: { items: [user], total: 1, page: 0, pageSize: 20 } })
        if (path === '/api/users/password-reset-candidates') return route.fulfill({ json: [{ id: user.id }] })
        if (path === '/api/users/system-admins' || path === '/api/users/stylists' || path === '/api/client-debts') return route.fulfill({ json: [] })
        return route.fulfill({ json: {} })
      })
      await page.goto('/admin/users', { waitUntil: 'networkidle' })
      const names = language === 'bs' ? [
        'Uredi korisnika sample.client', 'Pošalji link za reset lozinke korisniku sample.client',
        'Ukloni ulogu Vlasnik korisniku sample.client', 'Deaktiviraj korisnika sample.client',
      ] : [
        'Edit user sample.client', 'Send password reset link to sample.client',
        'Remove Owner role from sample.client', 'Deactivate user sample.client',
      ]
      for (const name of names) {
        const opener = page.getByRole('button', { name, exact: true })
        await page.getByRole('heading', { level: 1 }).focus()
        // Synthetic click preserves heading focus; this is not an OS/browser pointer audit.
        await opener.dispatchEvent('click')
        const dialog = page.getByRole('dialog')
        await expect(dialog).toBeVisible()
        await dialog.getByRole('button', { name: language === 'bs' ? 'Odustani' : 'Cancel', exact: true }).click()
        await expect(dialog).toBeHidden()
        await expect(opener).toBeFocused()
      }
      expect(writes).toEqual([])
    })
  }
}
