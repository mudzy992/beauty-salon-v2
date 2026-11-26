import { existsSync, readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

import { ADMIN_STATUS, type AdminStatus } from './auth-paths'
import { activateTheme, assertThemeSwitcherKeyboard, scanBothAppLanguages, stubGlobalTheme, type AurumChoice } from './aurum-a11y'

const ROUTES = [
  { path: '/admin', name: 'dashboard' },
  { path: '/admin/settings', name: 'settings hub' },
] as const
const CHOICES: AurumChoice[] = ['aurum-light', 'aurum-dark']

const readStatus = (): AdminStatus =>
  existsSync(ADMIN_STATUS)
    ? (JSON.parse(readFileSync(ADMIN_STATUS, 'utf8')) as AdminStatus)
    : { ok: false, reason: 'setup nije izvršen (nedostaje .auth/admin-status.json)' }

async function assertMobileSidebarReplacement(page: Page) {
  const originalViewport = page.viewportSize()
  await page.setViewportSize({ width: 320, height: 800 })
  await expect(page.locator('[data-admin-sidebar]')).toBeHidden()

  const trigger = page.locator('button[aria-controls="admin-mobile-navigation"]')
  await expect(trigger).toBeVisible()
  await expect(trigger.locator('svg')).toBeVisible()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await trigger.click()

  const nav = page.locator('#admin-mobile-navigation [data-admin-navigation]')
  await expect(nav).toBeVisible()
  await expect(nav.locator('a[href="/admin"]')).toBeVisible()
  await expect(nav.locator('a[href="/admin/settings"]')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  if (originalViewport) await page.setViewportSize(originalViewport)
}

test.beforeEach(() => {
  const status = readStatus()
  test.skip(!status.ok, `/admin/** nije testirano — ${status.reason}`)
})

for (const choice of CHOICES) {
  for (const route of ROUTES) {
    test(`S11 rendered axe ${choice}: admin ${route.name}`, async ({ page }, testInfo) => {
      await stubGlobalTheme(page)
      await page.goto(route.path, { waitUntil: 'networkidle' })
      await expect(page).not.toHaveURL(/\/login/)
      await activateTheme(page, choice)
      await assertMobileSidebarReplacement(page)
      await scanBothAppLanguages(page, testInfo, route.path, choice)
      await assertThemeSwitcherKeyboard(page, choice)
    })
  }
}
