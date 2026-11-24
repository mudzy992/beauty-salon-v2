import { expect, test } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['OWNER'] }
for (const lang of ['bs', 'en'] as const) {
  test(`hidden gallery retry preserves keyboard focus ${lang}`, async ({ page }) => {
    await page.addInitScript(language => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', language) }, lang)
    let count = 0
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/settings/public') return route.fulfill({ json: [] })
      if (path === '/api/users/profile') return route.fulfill({ json: profile })
      if (path === '/api/services/admin/services/svc-1') return route.fulfill({ json: { id: 'svc-1', name: 'Fixture service', durationMinutes: 30 } })
      if (path === '/api/daily-log/before-after') return route.fulfill({ json: { items: [], hasMore: false, nextOffset: 0 } })
      if (path === '/api/services/admin/work-gallery/svc-1/hidden') {
        count++
        return route.fulfill(count === 1 ? { status: 503, json: {} } : { json: { items: [], hasMore: false, nextOffset: 0 } })
      }
      return route.fulfill({ json: {} })
    })
    await page.goto('/admin/services/svc-1/work-gallery', { waitUntil: 'networkidle' })
    const summary = page.getByText(lang === 'bs' ? 'Skrivena poređenja' : 'Hidden comparisons', { exact: true })
    await summary.click()
    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible()
    const retry = alert.getByRole('button', { name: lang === 'bs' ? 'Pokušaj ponovo' : 'Try again' })
    await retry.focus()
    await page.keyboard.press('Enter')
    await expect(summary).toBeFocused()
    await expect(page.getByText(lang === 'bs' ? 'Nema skrivenih poređenja.' : 'There are no hidden comparisons.')).toBeVisible()
    expect(count).toBe(2)
  })
}
