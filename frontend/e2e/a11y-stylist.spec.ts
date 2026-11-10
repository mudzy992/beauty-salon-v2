import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'

import { STYLIST_STATUS, type AdminStatus } from './auth-paths'

/**
 * Rendered a11y dokaz za `/stylist/**`.
 *
 * Zašto zaseban spec od `a11y-admin.spec.ts`: guard je drugačiji. `StylistRoute`
 * (`src/components/StylistRoute.tsx:24-27`) traži ulogu **STYLIST** i bez nje redirektuje na
 * **`/`**, a NE na `/login` kao `ProtectedRoute`. Zato:
 *   1. treba zaseban `storageState` (admin token nije dovoljan),
 *   2. asertija „nismo redirektovani" mora gledati da li je URL ostao pod `/stylist`,
 *      jer provjera `/login` ovdje NE BI uhvatila neuspjeh.
 *
 * Ruta liste su uzete iz `src/app/router.tsx:75-131` (provjereno 2026-11-09).
 * Ruta s parametrom (`workbook/:entryId`, `workbook/reschedule-preview/:reservationId`,
 * `schedule/:reservationId`) namjerno NISU ovdje — traže stvaran ID iz baze, pa bi bez
 * seedovanog podatka testirale prazan/error ekran i davale lažnu sliku.
 *
 * 🟡 Testovi se PRESKAČU ako setup nije uspio prijaviti stilistu — vidi `auth.setup.ts`.
 */

const STYLIST_ROUTES = [
  { path: '/stylist/inbox', name: 'Inbox' },
  { path: '/stylist/workbook', name: 'Radna knjiga (lista)' },
  { path: '/stylist/workbook/new', name: 'Radna knjiga (novi unos)' },
  { path: '/stylist/schedule', name: 'Raspored' },
  { path: '/stylist/schedule/new', name: 'Raspored (nova rezervacija)' },
  { path: '/stylist/debts', name: 'Dugovanja' },
  { path: '/stylist/stats', name: 'Statistika' },
  { path: '/stylist/profile', name: 'Profil' },
]

const readStatus = (): AdminStatus =>
  existsSync(STYLIST_STATUS)
    ? (JSON.parse(readFileSync(STYLIST_STATUS, 'utf8')) as AdminStatus)
    : { ok: false, reason: 'setup nije izvršen (nedostaje .auth/stylist-status.json)' }

// 🔴 Odluka MORA biti u `beforeEach`, ne na nivou fajla. Playwright ucita spec fajlove pri
// sakupljanju testova, a to je PRIJE nego sto `setup` projekt upise status fajl; na nivou
// fajla `status.ok` je zato uvijek false i svi testovi se preskocu CAK I kad je prijava
// uspjela. Izmjereno: run 42855048776 — anotacije kazu `ok: true, prijavljen kao
// ci_a11y_admin`, a brojaci i dalje 13 passed | 25 skipped.
test.beforeEach(() => {
  const status = readStatus()
  test.skip(!status.ok, `/stylist/** nije testirano — ${status.reason}`)
})

for (const route of STYLIST_ROUTES) {
  test(`axe stylist: ${route.name} (${route.path})`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'networkidle' })

    // 🔴 Bez uloge STYLIST `StylistRoute` redirektuje na `/` (ne na `/login`). Ako bismo
    // provjeravali samo `/login`, axe bi izmjerio NASLOVNU stranicu i javio lažni prolaz.
    const url = new URL(page.url())
    expect(
      url.pathname.startsWith('/stylist'),
      `${route.path}: redirektovano na ${url.pathname} — sesija nema ulogu STYLIST`,
    ).toBe(true)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()

    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    )
    expect(
      blocking,
      `${route.path}: ${blocking.length} critical/serious prekršaja\n` +
        blocking
          .map((v) => `  ${v.id} (${v.impact}) ×${v.nodes.length}`)
          .join('\n'),
    ).toEqual([])
  })
}

test('2.4.1 stylist: skip-link je prvi fokusabilni element', async ({ page }) => {
  await page.goto('/stylist/inbox', { waitUntil: 'networkidle' })
  await page.keyboard.press('Tab')
  const focused = page.locator(':focus')
  await expect(focused).toHaveClass(/skip-link/)
})
