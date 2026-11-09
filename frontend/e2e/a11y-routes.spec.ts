import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/**
 * Rendered a11y dokaz — axe-core nad stvarnim DOM-om.
 *
 * 🔴 NIJE IZVRŠENO u sandboxu (browser binarni fajl se ne može preuzeti; vidi
 * `playwright.config.ts`). Sve WCAG stavke koje ovise o ovome ostaju 🟡 u
 * `docs/audit/FINDINGS.md`, ne ✅.
 *
 * Pokriva **javne** rute jer ne traže prijavu. Za `/admin/**` treba:
 *   1. podignut backend (`docker compose up` ili `npm run dev` u backend/)
 *   2. `storageState` s tokenom, npr.
 *      const ctx = await browser.newContext({ storageState: 'e2e/.auth/admin.json' })
 */
// Putanje su uzete iz `src/app/routes/public.routes.tsx` i `src/app/router.tsx`
// (provjereno 2026-11-09: ruta je `rezervacija`, **jednina** — `rezervacije` bi dalo 404).
const PUBLIC_ROUTES = [
  { path: '/', name: 'Početna' },
  { path: '/usluge', name: 'Usluge' },
  { path: '/galerija', name: 'Galerija' },
  { path: '/kontakt', name: 'Kontakt' },
  { path: '/rezervacija', name: 'Rezervacija' },
  { path: '/zadovoljni-klijenti', name: 'Recenzije' },
  { path: '/blog', name: 'Blog' },
  { path: '/login', name: 'Prijava' },
  { path: '/register', name: 'Registracija' },
]

for (const route of PUBLIC_ROUTES) {
  test(`axe: ${route.name} (${route.path})`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'networkidle' })
    const results = await new AxeBuilder({ page })
      // 2.3.3 / 1.4.11 / 1.4.3 su ciljevi ovog redizajna; experimentalne axe provjere nisu dokaz
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()

    const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
    expect(
      blocking,
      `${route.path}: ${blocking.length} critical/serious prekršaja\n` +
        blocking.map((v) => `  ${v.id} (${v.impact}) ×${v.nodes.length}`).join('\n'),
    ).toEqual([])
  })
}

test('2.4.1: skip-link je prvi fokusabilni element i vodi na glavni sadržaj', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.keyboard.press('Tab')
  const focused = page.locator(':focus')
  await expect(focused).toHaveClass(/skip-link/)
  const href = await focused.getAttribute('href')
  expect(href, 'skip-link mora ciljati glavni sadržaj').toBeTruthy()
  await page.keyboard.press('Enter')
  const target = page.locator(href!)
  await expect(target).toBeVisible()
})

test('2.4.2: svaka ruta postavlja <title>', async ({ page }) => {
  for (const route of PUBLIC_ROUTES) {
    await page.goto(route.path, { waitUntil: 'networkidle' })
    const title = (await page.title()).trim()
    expect(title.length, `${route.path}: prazan <title>`).toBeGreaterThan(0)
  }
})
