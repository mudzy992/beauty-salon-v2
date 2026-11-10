import AxeBuilder from '@axe-core/playwright'

import {
  AXE_RULE_TAGS,
  assertableViolations,
  defaultCoverageDir,
  recordAxeCoverage,
} from './axe-coverage.mjs'
import { expect, test } from '@playwright/test'
import { settleAnimations } from './settle'
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
  // `/stylist/profile` je NAMJERNI redirect na `/profil` (`src/app/router.tsx:126-129`), pa se
  // mjeri stvarna odredišna ruta. Bez ovog izuzetka asertija o prefiksu pada iako aplikacija
  // radi ispravno (izmjereno run 42857076298: „redirektovano na /profil").
  { path: '/stylist/profile', name: 'Profil (redirect na /profil)', expectPrefix: '/profil' },
] as { path: string; name: string; expectPrefix?: string }[]

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
    const expectedPrefix = route.expectPrefix ?? '/stylist'
    expect(
      url.pathname.startsWith(expectedPrefix),
      `${route.path}: očekivano ${expectedPrefix}*, dobijeno ${url.pathname} — sesija nema ulogu STYLIST`,
    ).toBe(true)

    // Čeka završetak animacija PRIJE analize: `app-logo-reveal` kreće od `opacity: 0.01`
    // (globals.css), pa axe mjeren u tom trenu vidi gotovo nevidljiv tekst i prijavi
    // `color-contrast` — to je bio flake na `/` (run `42907958179`: violations 1, a
    // ponavljanje istog posla dalo je 0).
    await settleAnimations(page)

    const results = await new AxeBuilder({ page })
      .withTags(AXE_RULE_TAGS)
      .analyze()

    // Bilježi status svakog praćenog axe pravila PRIJE asertacije, da se zapiše i kad
    // test padne — inače bi pad sakrio koje je pravilo bilo nepotpuno.
    recordAxeCoverage(test.info().project.name, route.path, results, defaultCoverageDir())

    const blocking = assertableViolations(results.violations).filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    )
    expect(
      blocking,
      `${route.path}: ${blocking.length} critical/serious prekršaja\n` +
        blocking
          .map(
            (v) =>
              // Target + HTML prvih čvorova: bez toga se zna samo BROJ prekršaja, ne i koji
              // element — a log i artefakt se ne daju dohvatiti izvan GitHub blob storagea.
              `  ${v.id} (${v.impact}) ×${v.nodes.length} :: ` +
              v.nodes
                .slice(0, 3)
                .map((n) => `[${(n.target || []).join(' ')}] ${String(n.html || '').slice(0, 140)}`)
                .join(' ~~ '),
          )
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
