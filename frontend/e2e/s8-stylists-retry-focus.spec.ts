import { expect, test } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const stylist = { id: 'stylist-1', userId: 'user-1', specialization: 'Cut', status: 'ACTIVE', isActive: true, hireDate: null, user: { username: 'hair.one', firstName: 'Hair', lastName: 'One', email: null } }

for (const language of ['bs', 'en'] as const) {
  test(`stylist list retry keeps focus while the retry button unmounts ${language}`, async ({ page }) => {
    await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
    let release!: () => void, reads = 0
    const gate = new Promise<void>(resolve => { release = resolve })
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/settings/public') return route.fulfill({ json: [] })
      if (path === '/api/users/profile') return route.fulfill({ json: profile })
      if (path === '/api/stylists/admin') {
        reads++
        if (reads === 1) return route.fulfill({ status: 500, json: {} })
        await gate
        return route.fulfill({ json: [stylist] })
      }
      return route.fulfill({ json: {} })
    })
    try {
      await page.goto('/admin/stylists', { waitUntil: 'networkidle' })
      const retry = page.getByRole('alert').getByRole('button', { name: language === 'bs' ? 'Pokušaj ponovo' : 'Try again' })
      await retry.focus(); await page.keyboard.press('Enter')
      await expect.poll(() => reads).toBe(2)
      const heading = page.getByRole('heading', { level: 1 })
      await expect(heading).toBeFocused()
      release()
      await expect(page.getByText('hair.one')).toBeVisible()
      await expect(heading).toBeFocused()
    } finally { release() }
  })
}
