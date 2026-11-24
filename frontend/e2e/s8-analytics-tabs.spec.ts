import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }

for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`analytics tabs retain query, keyboard focus, panel relationships and history ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
      await page.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname
        if (path === '/api/settings/public') return route.fulfill({ json: [] })
        if (path === '/api/users/profile') return route.fulfill({ json: profile })
        return route.fulfill({ json: {} })
      })
      await page.goto('/admin/analytics?tab=clients&userId=123&fromDate=2026-01-01', { waitUntil: 'networkidle' })
      const list = page.getByRole('tablist')
      await expect(list).toHaveCount(1)
      const tabs = list.getByRole('tab')
      await expect(tabs).toHaveCount(3)
      await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
      const selectedId = await tabs.nth(1).getAttribute('id')
      const panelId = await tabs.nth(1).getAttribute('aria-controls')
      await expect(page.getByRole('tabpanel')).toHaveAttribute('id', panelId!)
      await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', selectedId!)
      await expect(page.locator('[role="tabpanel"][hidden]')).toHaveCount(2)
      const scan = await new AxeBuilder({ page }).include('[role="tablist"]').withRules(['aria-required-attr', 'aria-required-children', 'aria-required-parent', 'aria-valid-attr', 'button-name']).analyze()
      expect(scan.violations).toEqual([])
      await tabs.nth(1).focus()
      await page.keyboard.press('ArrowRight')
      await expect(tabs.nth(2)).toBeFocused()
      await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true')
      await expect.poll(() => new URL(page.url()).searchParams.get('tab')).toBe('stylists')
      expect(new URL(page.url()).searchParams.get('userId')).toBe('123')
      expect(new URL(page.url()).searchParams.get('fromDate')).toBe('2026-01-01')
      await page.keyboard.press('Home')
      await expect(tabs.nth(0)).toBeFocused()
      await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true')
      await page.keyboard.press('End')
      await expect(tabs.nth(2)).toBeFocused()
      await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true')
      await page.goBack()
      await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true')
      await page.reload()
      await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true')
    })
  }
}
