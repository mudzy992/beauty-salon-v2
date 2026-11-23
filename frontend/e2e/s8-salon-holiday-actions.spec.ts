import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

for (const language of ['bs', 'en']) {
  for (const width of [320, 1280]) {
    test(`holiday row action names distinguish duplicate holidays ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
      const holidays = [
        { id: 'h-1', date: '2030-06-01', name: 'Summer', message: null, sendPush: true, pushSentAt: null },
        { id: 'h-2', date: '2030-06-01', name: 'Summer', message: null, sendPush: true, pushSentAt: null },
        { id: 'h-3', date: '2030-06-02', name: 'Summer', message: null, sendPush: true, pushSentAt: null },
      ]
      const writes: string[] = []
      await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname
        if (route.request().method() !== 'GET') { writes.push(`${route.request().method()} ${path}`); return route.fulfill({ json: {} }) }
        if (path === '/api/settings/public') return route.fulfill({ json: [] })
        if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
        if (path === '/api/salon/list') return route.fulfill({ json: [{ id: 'salon-1', name: 'Fixture', workingHours: [{ dayOfWeek: 1, openTime: '09:00', closeTime: '17:00', isWorkingDay: true }], holidays }] })
        return route.fulfill({ json: {} })
      })
      await page.goto('/admin/salon', { waitUntil: 'networkidle' })
      await page.getByRole('tab', { name: language === 'en' ? 'Holidays' : 'Praznici' }).click()
      const rows = page.getByRole('row').filter({ hasText: 'Summer' })
      await expect(rows).toHaveCount(3)
      const groups: string[][] = [[], [], []]
      for (let rowIndex = 0; rowIndex < 3; rowIndex++) {
        const buttons = rows.nth(rowIndex).getByRole('button')
        await expect(buttons).toHaveCount(3)
        for (let action = 0; action < 3; action++) {
          const name = await buttons.nth(action).getAttribute('aria-label')
          expect(name).toContain('Summer')
          groups[action].push(name!)
        }
        const editName = groups[1][rowIndex]
        expect(editName).toContain(language === 'en' ? 'Edit' : 'Uredi')
      }
      for (const group of groups) expect(new Set(group).size).toBe(3)
      const axe = await new AxeBuilder({ page }).include('table').withRules(['button-name', 'label-content-name-mismatch']).analyze()
      expect(axe.violations).toEqual([])
      const target = rows.nth(1).getByRole('button', { name: groups[2][1], exact: true })
      await target.click()
      const confirm = page.getByRole('dialog')
      await confirm.getByRole('button', { name: language === 'en' ? 'Cancel' : 'Odustani' }).click()
      await expect(target).toBeFocused()
      expect(writes).toEqual([])
      await target.click()
      await confirm.getByRole('button', { name: language === 'en' ? 'Delete' : 'Obriši', exact: true }).click()
      await expect.poll(() => writes).toEqual(['DELETE /api/salon/holidays/h-2'])
    })
  }
}
