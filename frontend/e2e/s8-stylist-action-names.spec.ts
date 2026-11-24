import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

for (const lang of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`stylist and competency actions identify duplicate names ${lang} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.addInitScript(language => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', language) }, lang)
      const stylists = ['one', 'two'].map(id => ({ id, userId: `user-${id}`, bio: id, specialization: 'Cut', status: 'ACTIVE', isActive: true, hireDate: null, user: { username: 'same.name', firstName: 'Same', lastName: 'Name', email: null } }))
      const services = ['a', 'b'].map(id => ({ id, name: 'Cut' }))
      await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname
        if (path === '/api/settings/public') return route.fulfill({ json: [] })
        if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
        if (path === '/api/stylists/admin') return route.fulfill({ json: stylists })
        if (path === '/api/services/admin/services') return route.fulfill({ json: services })
        if (path === '/api/stylists/one/working-hours') return route.fulfill({ json: [] })
        if (path === '/api/stylists/admin/one/services') return route.fulfill({ json: [{ serviceId: 'a' }, { serviceId: 'b' }] })
        return route.fulfill({ json: {} })
      })
      await page.goto('/admin/stylists', { waitUntil: 'networkidle' })
      const rows = page.getByRole('row').filter({ hasText: 'same.name' })
      await expect(rows).toHaveCount(2)
      const edits: string[] = [], analytics: string[] = []
      for (let i = 0; i < 2; i++) {
        const edit = rows.nth(i).getByRole('button')
        const link = rows.nth(i).getByRole('link')
        edits.push((await edit.getAttribute('aria-label'))!)
        analytics.push((await link.getAttribute('aria-label'))!)
        expect(edits[i]).toContain('same.name')
        expect(analytics[i]).toContain('same.name')
        await expect(link).toHaveAttribute('href', `/admin/analytics?tab=stylists&stylistId=${stylists[i].id}`)
      }
      expect(new Set(edits).size).toBe(2)
      expect(new Set(analytics).size).toBe(2)
      const tableAxe = await new AxeBuilder({ page }).include('table').withRules(['button-name', 'link-name', 'label-content-name-mismatch']).analyze()
      expect(tableAxe.violations).toEqual([])
      const trigger = rows.nth(0).getByRole('button')
      await trigger.click()
      const dialog = page.getByRole('dialog')
      await dialog.getByRole('tab', { name: lang === 'en' ? 'Competencies' : 'Kompetencije' }).click()
      const remove = dialog.getByRole('button', { name: lang === 'en' ? /Remove competency/ : /Ukloni kompetenciju/ })
      await expect(remove).toHaveCount(2)
      const names = await remove.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')))
      expect(names.every(name => name?.includes('Cut'))).toBe(true)
      expect(new Set(names).size).toBe(2)
      await remove.nth(0).click()
      await expect(remove).toHaveCount(1)
      await expect(dialog.getByText(lang === 'en' ? 'Available competencies' : 'Dostupne kompetencije', { exact: true })).toBeFocused()
      await remove.first().click()
      const available = dialog.getByRole('checkbox', { name: /Cut/ })
      await expect(available).toHaveCount(2)
      await expect(available.nth(0)).toHaveAccessibleName('Cut (1)')
      await expect(available.nth(1)).toHaveAccessibleName('Cut (2)')
      await available.nth(1).focus(); await page.keyboard.press('Space')
      await expect(remove).toHaveCount(1)
      await expect(remove.first()).toHaveAccessibleName(new RegExp('Cut \\(2\\)$'))
      await expect(dialog.getByText(lang === 'en' ? /Selected competencies \(click X/ : /Odabrane kompetencije \(kliknite X/)).toBeFocused()
      const skillsAxe = await new AxeBuilder({ page }).include('[role="dialog"]').withRules(['label', 'label-content-name-mismatch']).analyze()
      expect(skillsAxe.violations).toEqual([])
      await dialog.getByRole('button', { name: lang === 'en' ? 'Cancel' : 'Odustani' }).click()
      await expect(trigger).toBeFocused()
    })
  }
}
