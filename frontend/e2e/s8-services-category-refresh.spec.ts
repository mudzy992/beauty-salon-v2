import { expect, test } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const category = { id: 'cat', name: 'Category fixture', isActive: true, sortOrder: 0 }
const subcategory = { id: 'sub', categoryId: 'cat', name: 'Subcategory fixture', isActive: true, sortOrder: 0 }
const service = { id: 'svc', name: 'Service fixture', subcategoryId: 'sub', durationMinutes: 30, price: 30, gender: 'FEMALE', isActive: true, sortOrder: 0, heroImage: null, shortDescription: null }
const deferred = () => { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve }); return { promise, release } }
for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`late category deletion preserves and locks a new service draft ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
      const gate = deferred(), started = deferred(), refreshGate = deferred()
      let reads = 0, writes = 0
      await page.route('**/api/**', async route => {
        const req = route.request(), path = new URL(req.url()).pathname
        if (path === '/api/settings/public') return route.fulfill({ json: [] })
        if (path === '/api/users/profile') return route.fulfill({ json: profile })
        if (path === '/api/services/admin/categories') { reads++; if (reads > 1) await refreshGate.promise; return route.fulfill({ json: [category] }) }
        if (path === '/api/services/admin/subcategories') return route.fulfill({ json: [subcategory] })
        if (path === '/api/services/admin/services') return route.fulfill({ json: [service] })
        if (path === '/api/services/categories/cat' && req.method() === 'DELETE') { writes++; started.release(); await gate.promise; return route.fulfill({ json: {} }) }
        if (req.method() !== 'GET') writes++
        return route.fulfill({ json: {} })
      })
      try {
        await page.goto('/admin/services', { waitUntil: 'networkidle' })
        await page.getByRole('button', { name: /Category fixture/, expanded: false }).click()
        await page.getByRole('button', { name: `${language === 'bs' ? 'Obriši kategoriju' : 'Delete category'}: Category fixture`, exact: true }).click()
        await page.getByRole('dialog').getByRole('button', { name: language === 'bs' ? 'Obriši' : 'Delete', exact: true }).click()
        await started.promise
        await page.getByRole('button', { name: `${language === 'bs' ? 'Uredi uslugu' : 'Edit service'}: Service fixture`, exact: true }).click()
        const dialog = page.getByRole('dialog')
        await dialog.locator('#services-service-name').fill('Unfinished draft')
        const save = dialog.getByRole('button', { name: language === 'bs' ? 'Sačuvaj' : 'Save', exact: true })
        await save.focus()
        const before = reads
        const response = page.waitForResponse(r => r.url().endsWith('/api/services/categories/cat') && r.request().method() === 'DELETE')
        gate.release(); await response
        await expect(dialog.getByRole('alert')).toContainText(language === 'bs' ? 'Katalog se promijenio' : 'The catalogue has changed')
        await expect(dialog.locator('#services-service-name')).toHaveValue('Unfinished draft')
        await expect(save).toHaveAttribute('aria-disabled', 'true')
        await expect(save).toBeFocused()
        await page.keyboard.press('Enter')
        expect(writes).toBe(1)
        expect(reads).toBe(before)
        await dialog.getByRole('button', { name: language === 'bs' ? 'Odustani' : 'Cancel', exact: true }).click()
        await expect.poll(() => reads).toBeGreaterThan(before)
        refreshGate.release()
      } finally { gate.release(); refreshGate.release() }
    })
  }
}
