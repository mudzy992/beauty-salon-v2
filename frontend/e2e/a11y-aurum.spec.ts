import { expect, test } from '@playwright/test'

import { activateTheme, assertThemeSwitcherKeyboard, scanBothAppLanguages, stubGlobalTheme, type AurumChoice } from './aurum-a11y'

const ROUTES = [
  { path: '/', name: 'public home' },
  // Guest booking redirects to /login; this test deliberately reports that destination,
  // not an authenticated booking form or a successful booking flow.
  { path: '/rezervacija', name: 'guest booking entry', finalPath: /\/login(?:\?.*)?$/ },
] as const
const CHOICES: AurumChoice[] = ['aurum-light', 'aurum-dark']

for (const choice of CHOICES) {
  for (const route of ROUTES) {
    test(`S11 rendered axe ${choice}: ${route.name} (${route.path})`, async ({ page }, testInfo) => {
      await stubGlobalTheme(page)
      await page.goto(route.path, { waitUntil: 'networkidle' })
      if ('finalPath' in route) await expect(page).toHaveURL(route.finalPath)
      await activateTheme(page, choice)
      await scanBothAppLanguages(page, testInfo, route.path, choice)
      await assertThemeSwitcherKeyboard(page, choice)
    })
  }
}
