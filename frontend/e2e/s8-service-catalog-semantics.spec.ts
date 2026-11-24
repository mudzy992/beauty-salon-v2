import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const categories = [1, 2].map(n => ({ id: `cat-${n}`, name: 'Same category', isActive: true, sortOrder: n }))
const subcategories = [1, 2].map(n => ({ id: `sub-${n}`, categoryId: `cat-${n}`, name: 'Same subcategory', isActive: true, sortOrder: n }))
for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`service catalog has independent category controls and named add actions ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
      let createdSubcategory: Record<string, unknown> | undefined
      await page.route('**/api/**', route => {
        if (new URL(route.request().url()).pathname === '/api/services/subcategories' && route.request().method() === 'POST') {
          createdSubcategory = route.request().postDataJSON() as Record<string, unknown>
          return route.fulfill({ json: { id: 'created' } })
        }
        const path = new URL(route.request().url()).pathname
        if (path === '/api/settings/public') return route.fulfill({ json: [] })
        if (path === '/api/users/profile') return route.fulfill({ json: profile })
        if (path === '/api/services/admin/categories') return route.fulfill({ json: categories })
        if (path === '/api/services/admin/subcategories') return route.fulfill({ json: subcategories })
        if (path === '/api/services/admin/services') return route.fulfill({ json: [] })
        return route.fulfill({ json: {} })
      })
      await page.goto('/admin/services', { waitUntil: 'networkidle' })
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
      await expect(page.locator('button button')).toHaveCount(0)
      const initial = await new AxeBuilder({ page }).include('main').withRules(['nested-interactive', 'button-name', 'label-content-name-mismatch']).analyze()
      expect(initial.violations).toEqual([])
      const categoriesButtons = page.getByRole('button', { name: /^Same category/ }).filter({ hasNot: page.locator('button') })
      await expect(categoriesButtons).toHaveCount(2)
      const triggerNames = await categoriesButtons.evaluateAll(nodes => nodes.map(node => node.textContent?.replace(/\s+/g, ' ').trim()))
      expect(new Set(triggerNames).size).toBe(2)
      for (const button of await categoriesButtons.all()) {
        await expect(button).toHaveAttribute('aria-expanded', 'false')
        await button.focus(); await page.keyboard.press('Enter')
        await expect(button).toHaveAttribute('aria-expanded', 'true')
      }
      const addText = language === 'bs' ? 'Dodaj uslugu' : 'Add service'
      const add = page.getByRole('button', { name: new RegExp(`^${addText}: Same subcategory`) })
      await expect(add).toHaveCount(2)
      const names = await add.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')))
      expect(new Set(names).size).toBe(2)
      for (const name of names) expect(name).toContain(addText)
      await add.nth(1).focus(); await page.keyboard.press('Enter')
      const dialog = page.getByRole('dialog')
      await expect(dialog.locator('#services-service-name')).toBeVisible()
      await dialog.getByRole('button', { name: language === 'bs' ? 'Odustani' : 'Cancel' }).click()
      await expect(dialog).toBeHidden()
      await expect(add.nth(1)).toBeFocused()
      for (const button of await categoriesButtons.all()) await expect(button).toHaveAttribute('aria-expanded', 'true')
      const expanded = await new AxeBuilder({ page }).include('main').withRules(['nested-interactive', 'button-name', 'label-content-name-mismatch']).analyze()
      expect(expanded.violations).toEqual([])
      const categoryAdd = page.getByRole('button', { name: new RegExp(`^${language === 'bs' ? 'Dodaj potkategoriju' : 'Add subcategory'}: Same category`) })
      await expect(categoryAdd).toHaveCount(2)
      const categoryNames = await categoryAdd.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')))
      expect(new Set(categoryNames).size).toBe(2)
      await categoryAdd.nth(1).focus(); await page.keyboard.press('Enter')
      await expect(dialog.locator('#services-common-name-2')).toBeVisible()
      for (const button of await categoriesButtons.all()) await expect(button).toHaveAttribute('aria-expanded', 'true')
      await dialog.locator('#services-common-name-2').fill('Created subcategory')
      await dialog.getByRole('button', { name: language === 'bs' ? 'Sačuvaj' : 'Save', exact: true }).click()
      await expect.poll(() => createdSubcategory?.categoryId).toBe('cat-2')
    })
  }
}
