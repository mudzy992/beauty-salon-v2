import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

async function auditConfirm(page: Page, dialog: Locator) {
  await dialog.evaluate(el => el.setAttribute('data-users-confirm-audit', 'true'))
  const result = await new AxeBuilder({ page }).include('[data-users-confirm-audit="true"]').withRules(['button-name', 'label-content-name-mismatch', 'aria-valid-attr', 'aria-required-attr']).analyze()
  expect(result.violations).toEqual([])
}

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const client = { id: 'client-1', username: 'sample.client', email: 'sample@example.test', firstName: 'Sample', lastName: 'Client', phone: '123456', gender: 'FEMALE', avatar: null, isActive: true, isEmailVerified: true, mustChangePassword: false, createdAt: '2026-01-01T00:00:00Z', userRoles: [{ role: { name: 'CLIENT' } }] }
for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    for (const scenario of ['assign-role', 'edit-deactivate'] as const) {
      test(`user ${scenario} requires confirmation and preserves the write contract ${language} ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 })
        await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
        const writes: { method: string; path: string; body: unknown }[] = []
        await page.route('**/api/**', async route => {
          const req = route.request(), path = new URL(req.url()).pathname
          if (req.method() !== 'GET') { writes.push({ method: req.method(), path, body: req.postData() ? req.postDataJSON() : null }); return route.fulfill({ json: {} }) }
          if (path === '/api/settings/public') return route.fulfill({ json: [] })
          if (path === '/api/users/profile') return route.fulfill({ json: profile })
          if (path === '/api/users/clients/admin') return route.fulfill({ json: { items: [client], total: 1, page: 0, pageSize: 20 } })
          if (path === '/api/users/system-admins' || path === '/api/users/stylists' || path === '/api/users/password-reset-candidates' || path === '/api/client-debts') return route.fulfill({ json: [] })
          return route.fulfill({ json: {} })
        })
        await page.goto('/admin/users', { waitUntil: 'networkidle' })
        const confirmTitle = language === 'bs' ? 'Potvrda' : 'Confirmation'
        const cancelName = language === 'bs' ? 'Odustani' : 'Cancel'
        const confirmName = language === 'bs' ? 'Potvrdi' : 'Confirm'
        if (scenario === 'assign-role') {
          const opener = page.getByRole('button', { name: language === 'bs' ? 'Dodaj ulogu korisniku sample.client' : 'Add role to sample.client' })
          const openConfirmation = async () => {
            await opener.click()
            await page.getByRole('menuitem', { name: language === 'bs' ? 'Stilist' : 'Stylist', exact: true }).click()
          }
          await openConfirmation()
          const confirm = page.getByRole('dialog', { name: confirmTitle })
          await expect(confirm).toBeVisible()
          await expect(confirm).toContainText('sample.client')
          await expect(confirm).toContainText(language === 'bs' ? 'Stilist' : 'Stylist')
          await auditConfirm(page, confirm)
          expect(writes).toEqual([])
          await confirm.getByRole('button', { name: cancelName, exact: true }).click()
          await expect(opener).toBeFocused()
          expect(writes).toEqual([])
          await openConfirmation()
          await confirm.getByRole('button', { name: confirmName, exact: true }).click()
          await expect.poll(() => writes.length).toBe(1)
          expect(writes[0]).toEqual({ method: 'POST', path: '/api/users/client-1/roles', body: { role: 'STYLIST' } })
        } else {
          await page.getByRole('button', { name: language === 'bs' ? 'Uredi korisnika sample.client' : 'Edit user sample.client' }).click()
          const edit = page.getByRole('dialog', { name: language === 'bs' ? 'Uredi korisnika: sample.client' : 'Edit user: sample.client' })
          await edit.getByRole('switch').click()
          const save = edit.getByRole('button', { name: language === 'bs' ? 'Sačuvaj' : 'Save', exact: true })
          await save.click()
          const confirm = page.getByRole('dialog', { name: confirmTitle })
          await expect(confirm).toBeVisible()
          await expect(confirm).toContainText('sample.client')
          await auditConfirm(page, confirm)
          expect(writes).toEqual([])
          await page.keyboard.press('Escape')
          await expect(confirm).toHaveCount(0)
          await expect(edit).toBeVisible()
          await expect(save).toBeFocused()
          expect(writes).toEqual([])
          await save.click()
          await confirm.getByRole('button', { name: confirmName, exact: true }).click()
          await expect.poll(() => writes.length).toBe(1)
          expect(writes[0]).toEqual({ method: 'PATCH', path: '/api/users/client-1', body: { username: 'sample.client', firstName: 'Sample', lastName: 'Client', email: 'sample@example.test', phone: '123456', isActive: false } })
        }
      })
    }
  }
}

for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    for (const mode of ['unchanged-active', 'activate'] as const) {
      test(`non-deactivation user edit saves without a new confirmation ${language} ${width} ${mode}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 })
        await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
        const writes: { path: string; body: unknown }[] = []
        await page.route('**/api/**', route => {
          const req = route.request(), path = new URL(req.url()).pathname
          if (req.method() !== 'GET') { writes.push({ path, body: req.postDataJSON() }); return route.fulfill({ json: {} }) }
          if (path === '/api/settings/public') return route.fulfill({ json: [] })
          if (path === '/api/users/profile') return route.fulfill({ json: profile })
          if (path === '/api/users/clients/admin') return route.fulfill({ json: { items: [{ ...client, isActive: mode !== 'activate' }], total: 1, page: 0, pageSize: 20 } })
          if (path === '/api/users/system-admins' || path === '/api/users/stylists' || path === '/api/users/password-reset-candidates' || path === '/api/client-debts') return route.fulfill({ json: [] })
          return route.fulfill({ json: {} })
        })
        await page.goto('/admin/users', { waitUntil: 'networkidle' })
        await page.getByRole('button', { name: language === 'bs' ? 'Uredi korisnika sample.client' : 'Edit user sample.client' }).click()
        const edit = page.getByRole('dialog', { name: language === 'bs' ? 'Uredi korisnika: sample.client' : 'Edit user: sample.client' })
        if (mode === 'activate') await edit.getByRole('switch').click()
        await edit.locator('#users-phone').fill('654321')
        await edit.getByRole('button', { name: language === 'bs' ? 'Sačuvaj' : 'Save', exact: true }).click()
        await expect.poll(() => writes.length).toBe(1)
        expect(writes[0]).toEqual({ path: '/api/users/client-1', body: { username: 'sample.client', firstName: 'Sample', lastName: 'Client', email: 'sample@example.test', phone: '654321', isActive: true } })
        await expect(page.getByRole('dialog', { name: language === 'bs' ? 'Potvrda' : 'Confirmation' })).toHaveCount(0)
      })
    }
  }
}

for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`role assignment blocks repeated requests while pending and enables retry after failure ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
      let release!: () => void, writes = 0
      const gate = new Promise<void>(resolve => { release = resolve })
      await page.route('**/api/**', async route => {
        const req = route.request(), path = new URL(req.url()).pathname
        if (req.method() !== 'GET') {
          writes++
          if (writes === 1) { await gate; return route.fulfill({ status: 500, json: {} }) }
          return route.fulfill({ json: {} })
        }
        if (path === '/api/settings/public') return route.fulfill({ json: [] })
        if (path === '/api/users/profile') return route.fulfill({ json: profile })
        if (path === '/api/users/clients/admin') return route.fulfill({ json: { items: [client], total: 1, page: 0, pageSize: 20 } })
        if (path === '/api/users/system-admins' || path === '/api/users/stylists' || path === '/api/users/password-reset-candidates' || path === '/api/client-debts') return route.fulfill({ json: [] })
        return route.fulfill({ json: {} })
      })
      try {
        await page.goto('/admin/users', { waitUntil: 'networkidle' })
        const opener = page.getByRole('button', { name: language === 'bs' ? 'Dodaj ulogu korisniku sample.client' : 'Add role to sample.client' })
        const select = async () => {
          await opener.click()
          await page.getByRole('menuitem', { name: language === 'bs' ? 'Stilist' : 'Stylist', exact: true }).click()
          await page.getByRole('dialog', { name: language === 'bs' ? 'Potvrda' : 'Confirmation' }).getByRole('button', { name: language === 'bs' ? 'Potvrdi' : 'Confirm', exact: true }).click()
        }
        await select()
        await expect.poll(() => writes).toBe(1)
        await expect(opener).toBeDisabled()
        await expect(opener).toHaveAttribute('aria-busy', 'true')
        await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
        release()
        await expect(opener).toBeEnabled()
        await select()
        await expect.poll(() => writes).toBe(2)
      } finally { release() }
    })
  }
}

for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`deactivation failure leaves editor usable and requires reconfirming ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
      let release!: () => void, writes = 0
      const gate = new Promise<void>(resolve => { release = resolve })
      await page.route('**/api/**', async route => {
        const req = route.request(), path = new URL(req.url()).pathname
        if (req.method() !== 'GET') {
          writes++
          if (writes === 1) { await gate; return route.fulfill({ status: 500, json: {} }) }
          return route.fulfill({ json: {} })
        }
        if (path === '/api/settings/public') return route.fulfill({ json: [] })
        if (path === '/api/users/profile') return route.fulfill({ json: profile })
        if (path === '/api/users/clients/admin') return route.fulfill({ json: { items: [client], total: 1, page: 0, pageSize: 20 } })
        if (path === '/api/users/system-admins' || path === '/api/users/stylists' || path === '/api/users/password-reset-candidates' || path === '/api/client-debts') return route.fulfill({ json: [] })
        return route.fulfill({ json: {} })
      })
      try {
        await page.goto('/admin/users', { waitUntil: 'networkidle' })
        await page.getByRole('button', { name: language === 'bs' ? 'Uredi korisnika sample.client' : 'Edit user sample.client' }).click()
        const title = language === 'bs' ? 'Uredi korisnika: sample.client' : 'Edit user: sample.client'
        const edit = page.getByRole('dialog', { name: title })
        await edit.getByRole('switch').click()
        const save = edit.getByRole('button', { name: language === 'bs' ? 'Sačuvaj' : 'Save', exact: true })
        const confirm = page.getByRole('dialog', { name: language === 'bs' ? 'Potvrda' : 'Confirmation' })
        await save.click()
        await confirm.getByRole('button', { name: language === 'bs' ? 'Potvrdi' : 'Confirm', exact: true }).click()
        await expect.poll(() => writes).toBe(1)
        await expect(edit.getByRole('heading', { name: title })).toBeFocused()
        await expect(edit.getByRole('button', { name: language === 'bs' ? 'Spremanje…' : 'Saving…', exact: true })).toBeDisabled()
        release()
        await expect(save).toBeEnabled()
        await expect(edit).toBeVisible()
        await expect(edit.getByRole('switch')).toHaveAttribute('data-state', 'unchecked')
        await save.click()
        await expect(confirm).toBeVisible()
        expect(writes).toBe(1)
        await confirm.getByRole('button', { name: language === 'bs' ? 'Potvrdi' : 'Confirm', exact: true }).click()
        await expect.poll(() => writes).toBe(2)
      } finally { release() }
    })
  }
}
