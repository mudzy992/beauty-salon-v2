import AxeBuilder from '@axe-core/playwright'

import { defaultCoverageDir, recordAxeCoverage } from './axe-coverage.mjs'
import { expect, test } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'

import { ADMIN_STATUS, type AdminStatus } from './auth-paths'

/**
 * Rendered a11y dokaz za `/admin/**` — dio redizajna koji dosad NIJE bio pokriven.
 *
 * Zašto je ovo bila najveća rupa: prvi axe run (2026-11-09) prošao je **samo javne rute**,
 * a admin/stylist dashboard je najveći dio redizajna. Bez podignutog backend-a admin stranice
 * se uopšte ne mogu renderovati u prijavljenom stanju.
 *
 * Ruta liste su uzete iz `src/app/routes/admin.routes.tsx` (provjereno 2026-11-09).
 * `TabRedirect` rute (`/admin/debtors`, `/admin/settings/seo`, ...) namjerno NISU ovdje:
 * one samo preusmjere na hub s `?tab=`, pa bi axe mjerio isti DOM dva puta.
 *
 * 🟡 Testovi se PRESKAČU ako setup nije uspio prijaviti korisnika — vidi `auth.setup.ts`.
 * Preskakanje je glasno (razlog se ispiše), jer tiho preskakanje izgleda kao prolaz.
 */

const ADMIN_ROUTES = [
  { path: '/admin', name: 'Dashboard' },
  { path: '/admin/users', name: 'Korisnici' },
  { path: '/admin/salon', name: 'Salon' },
  { path: '/admin/services', name: 'Usluge' },
  { path: '/admin/stylists', name: 'Stilisti' },
  { path: '/admin/reservations', name: 'Rezervacije' },
  { path: '/admin/daily-log', name: 'Dnevnik' },
  { path: '/admin/finance', name: 'Finansije' },
  { path: '/admin/blog', name: 'Blog (admin)' },
  { path: '/admin/gallery', name: 'Galerija (admin)' },
  { path: '/admin/reviews', name: 'Recenzije (admin)' },
  { path: '/admin/settings', name: 'Postavke (hub)' },
  { path: '/admin/analytics', name: 'Analitika (hub)' },
  { path: '/admin/loyalty', name: 'Loyalty' },
  // ⚠️ Ova ruta NIJE u `admin.routes.tsx` — definisana je zasebno u `app/router.tsx:133`,
  // pa je prvi grep po `admin.routes.tsx` nije uhvatio. Dodato 2026-11-09.
  { path: '/admin/reservations/calendar', name: 'Kalendar rezervacija' },
]

const readStatus = (): AdminStatus =>
  existsSync(ADMIN_STATUS)
    ? (JSON.parse(readFileSync(ADMIN_STATUS, 'utf8')) as AdminStatus)
    : { ok: false, reason: 'setup nije izvršen (nedostaje .auth/admin-status.json)' }

// Bez prijave admin rute redirektuju na /login, pa bi axe mjerio POGREŠNU stranicu i
// dao lažni prolaz. Zato se testovi preskaču.
// 🔴 Odluka MORA biti u `beforeEach`, ne na nivou fajla. Playwright ucita spec fajlove pri
// sakupljanju testova, a to je PRIJE nego sto `setup` projekt upise status fajl; na nivou
// fajla `status.ok` je zato uvijek false i svi testovi se preskocu CAK I kad je prijava
// uspjela. Izmjereno: run 42855048776 — anotacije kazu `ok: true, prijavljen kao
// ci_a11y_admin`, a brojaci i dalje 13 passed | 25 skipped.
test.beforeEach(() => {
  const status = readStatus()
  test.skip(!status.ok, `/admin/** nije testirano — ${status.reason}`)
})

for (const route of ADMIN_ROUTES) {
  test(`axe admin: ${route.name} (${route.path})`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'networkidle' })

    // Ako sesija nije važna, `ProtectedRoute` redirektuje na /login. To NIJE prolaz:
    // mjeren bi bio DOM stranice za prijavu.
    const url = page.url()
    expect(
      url.includes('/login'),
      `${route.path}: redirektovano na /login — sesija nije prihvaćena`,
    ).toBe(false)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()

    // Bilježi status svakog praćenog axe pravila PRIJE asertacije, da se zapiše i kad
    // test padne — inače bi pad sakrio koje je pravilo bilo nepotpuno.
    recordAxeCoverage(test.info().project.name, route.path, results, defaultCoverageDir())

    const blocking = results.violations.filter(
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

test('2.4.1 admin: skip-link je prvi fokusabilni element', async ({ page }) => {
  await page.goto('/admin', { waitUntil: 'networkidle' })
  await page.keyboard.press('Tab')
  const focused = page.locator(':focus')
  await expect(focused).toHaveClass(/skip-link/)
})
