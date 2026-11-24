import { expect, test } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const category = { id: 'cat', name: 'Fixture category', isActive: true, sortOrder: 0 }
const subcategory = { id: 'sub', categoryId: 'cat', name: 'Fixture subcategory', isActive: true, sortOrder: 0 }
const service = { id: 'svc', name: 'Fixture service', subcategoryId: 'sub', durationMinutes: 30, price: 30, gender: 'FEMALE', isActive: true, sortOrder: 0, heroImage: null, shortDescription: null }
for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`service dialogs restore the clicked opener even when click does not focus it ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
      let writes = 0
      await page.route('**/api/**', route => {
        const req = route.request(), path = new URL(req.url()).pathname
        if (req.method() !== 'GET') { writes++; return route.fulfill({ json: {} }) }
        if (path === '/api/settings/public') return route.fulfill({ json: [] })
        if (path === '/api/users/profile') return route.fulfill({ json: profile })
        if (path === '/api/services/admin/categories') return route.fulfill({ json: [category] })
        if (path === '/api/services/admin/subcategories') return route.fulfill({ json: [subcategory] })
        if (path === '/api/services/admin/services') return route.fulfill({ json: [service] })
        if (path.endsWith('/deletion-impact')) return route.fulfill({ status: 500, json: {} })
        return route.fulfill({ json: {} })
      })
      await page.goto('/admin/services', { waitUntil: 'networkidle' })
      await page.getByRole('button', { name: /Fixture category/, expanded: false }).click()
      const names = language === 'bs' ? [
        'Nova Kategorija', 'Dodaj potkategoriju: Fixture category', 'Uredi kategoriju: Fixture category',
        'Obriši kategoriju: Fixture category', 'Dodaj uslugu: Fixture subcategory',
        'Uredi potkategoriju: Fixture subcategory', 'Obriši potkategoriju: Fixture subcategory',
        'Uredi uslugu: Fixture service', 'Obriši uslugu: Fixture service',
      ] : [
        'New category', 'Add subcategory: Fixture category', 'Edit category: Fixture category',
        'Delete category: Fixture category', 'Add service: Fixture subcategory',
        'Edit subcategory: Fixture subcategory', 'Delete subcategory: Fixture subcategory',
        'Edit service: Fixture service', 'Delete service: Fixture service',
      ]
      for (const name of names) {
        const opener = page.getByRole('button', { name, exact: true })
        await expect(opener).toBeVisible()
        await page.getByRole('heading', { level: 1 }).focus()
        // Synthetic click intentionally leaves focus on the heading, modelling browsers
        // where a pointer click does not focus buttons; it is not an OS/browser audit.
        await opener.dispatchEvent('click')
        const dialog = page.getByRole('dialog')
        await expect(dialog).toBeVisible()
        await dialog.getByRole('button', { name: language === 'bs' ? 'Odustani' : 'Cancel', exact: true }).click()
        await expect(dialog).toBeHidden()
        await expect(opener).toBeFocused()
      }
      expect(writes).toBe(0)
    })
  }
}
