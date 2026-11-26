import { existsSync, readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

import { STYLIST_STATUS, type AdminStatus } from './auth-paths'
import { activateTheme, assertThemeSwitcherKeyboard, scanBothAppLanguages, stubGlobalTheme, type AurumChoice } from './aurum-a11y'

const ROUTE = { path: '/stylist/inbox', name: 'stylist inbox' }
const CHOICES: AurumChoice[] = ['aurum-light', 'aurum-dark']

const readStatus = (): AdminStatus =>
  existsSync(STYLIST_STATUS)
    ? (JSON.parse(readFileSync(STYLIST_STATUS, 'utf8')) as AdminStatus)
    : { ok: false, reason: 'setup nije izvršen (nedostaje .auth/stylist-status.json)' }

test.beforeEach(() => {
  const status = readStatus()
  test.skip(!status.ok, `/stylist/** nije testirano — ${status.reason}`)
})

for (const choice of CHOICES) {
  test(`S11 rendered axe ${choice}: ${ROUTE.name}`, async ({ page }, testInfo) => {
    await stubGlobalTheme(page)
    await page.goto(ROUTE.path, { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/stylist\/inbox/)
    await activateTheme(page, choice)
    await scanBothAppLanguages(page, testInfo, ROUTE.path, choice)
    await assertThemeSwitcherKeyboard(page, choice)
  })
}
