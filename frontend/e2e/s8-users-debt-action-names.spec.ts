import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const client = { id: 'client-1', username: 'sample.client', email: 'sample@example.test', firstName: 'Sample', lastName: 'Client', phone: null, gender: 'FEMALE', avatar: null, isActive: true, isEmailVerified: true, createdAt: '2026-01-01T00:00:00Z', userRoles: [{ role: { name: 'CLIENT' } }] }
const debts = [
  { id: 'debt-1', amount: 25, createdAt: '2026-01-01T00:00:00Z', service: { id: 's1', name: 'Fixture service' } },
  { id: 'debt-2', amount: 25, createdAt: '2026-01-01T00:00:00Z', service: { id: 's1', name: 'Fixture service' } },
  { id: 'debt-3', amount: 12, createdAt: '2026-01-02T00:00:00Z', service: null },
]
for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`user debt actions identify duplicate debts and confirm the selected target ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
      let active = [...debts]
      const writes: { path: string; body: unknown }[] = []
      await page.route('**/api/**', route => {
        const req = route.request(), path = new URL(req.url()).pathname
        if (path === '/api/settings/public') return route.fulfill({ json: [] })
        if (path === '/api/users/profile') return route.fulfill({ json: profile })
        if (path === '/api/users/clients/admin') return route.fulfill({ json: { items: [client], total: 1, page: 0, pageSize: 20 } })
        if (path === '/api/users/system-admins' || path === '/api/users/stylists' || path === '/api/users/password-reset-candidates') return route.fulfill({ json: [] })
        if (path.endsWith('/username-availability')) return route.fulfill({ json: { available: true, suggestions: [] } })
        if (path === '/api/client-debts') return route.fulfill({ json: active })
        if (path.startsWith('/api/client-debts/') && path.endsWith('/write-off')) {
          expect(req.method()).toBe('PATCH')
          writes.push({ path, body: req.postDataJSON() })
          active = active.filter(d => path !== `/api/client-debts/${d.id}/write-off`)
          return route.fulfill({ json: {} })
        }
        return route.fulfill({ json: {} })
      })
      await page.goto('/admin/users', { waitUntil: 'networkidle' })
      await page.getByRole('button', { name: language === 'bs' ? /Uredi korisnika sample.client/ : /Edit user sample.client/ }).click()
      const edit = page.getByRole('dialog').filter({ has: page.locator('#users-username') })
      const actionPrefix = language === 'bs' ? 'Otpiši dug' : 'Write off debt'
      const actions = edit.getByRole('button', { name: new RegExp(`^${actionPrefix}`) })
      await expect(actions).toHaveCount(3)
      const names = await actions.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')))
      expect(names.every(name => name?.startsWith(actionPrefix))).toBe(true)
      expect(new Set(names).size).toBe(3)
      expect(names[0]).toContain('Fixture service')
      expect(names[1]).toContain('Fixture service')
      expect(names[0]).toContain('25')
      expect(names[2]).toContain('12')
      expect(names[2]).toContain(language === 'bs' ? 'Usluga nije navedena' : 'Service not specified')
      const axe = await new AxeBuilder({ page }).include('[data-users-dialog]').withRules(['button-name', 'label-content-name-mismatch']).analyze()
      expect(axe.violations).toEqual([])
      const target = actions.nth(1)
      await target.focus(); await page.keyboard.press('Enter')
      const confirm = page.getByRole('dialog', { name: language === 'bs' ? 'Otpis duga' : 'Write off debt' })
      await expect(confirm).toBeVisible()
      await expect.poll(() => confirm.evaluate(el => el.contains(document.activeElement))).toBe(true)
      await page.keyboard.press('Escape')
      await expect(confirm).toBeHidden()
      await expect(edit).toBeVisible()
      await expect(target).toBeFocused()
      expect(writes).toEqual([])
      await target.click()
      await confirm.getByLabel(language === 'bs' ? 'Razlog otpisa' : 'Reason for write-off').fill('fixture reason')
      await confirm.getByRole('button', { name: actionPrefix, exact: true }).click()
      await expect(confirm).toBeHidden()
      await expect(actions).toHaveCount(2)
      expect(writes).toEqual([{ path: '/api/client-debts/debt-2/write-off', body: { note: 'fixture reason' } }])
    })
  }
}
