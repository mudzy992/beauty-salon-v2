import { existsSync, readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

import { ADMIN_STATUS, type AdminStatus } from './auth-paths'
import { activateTheme, assertThemeSwitcherKeyboard, scanBothAppLanguages, stubGlobalTheme, type AurumChoice } from './aurum-a11y'

const ROUTES = [
  { path: '/admin', name: 'dashboard' },
  { path: '/admin/settings', name: 'settings hub' },
] as const
const CHOICES: AurumChoice[] = ['classic', 'aurum-light', 'aurum-dark']

const readStatus = (): AdminStatus =>
  existsSync(ADMIN_STATUS)
    ? (JSON.parse(readFileSync(ADMIN_STATUS, 'utf8')) as AdminStatus)
    : { ok: false, reason: 'setup nije izvršen (nedostaje .auth/admin-status.json)' }

test.beforeEach(() => {
  const status = readStatus()
  test.skip(!status.ok, `/admin/** nije testirano — ${status.reason}`)
})

for (const choice of CHOICES) {
  for (const route of ROUTES) {
    test(`S11 rendered axe ${choice}: admin ${route.name}`, async ({ page }, testInfo) => {
      await stubGlobalTheme(page, choice)
      await page.goto(route.path, { waitUntil: 'networkidle' })
      await expect(page).not.toHaveURL(/\/login/)
      await activateTheme(page, choice)
      await scanBothAppLanguages(page, testInfo, route.path, choice)
      await assertThemeSwitcherKeyboard(page, choice)
    })
  }
}
