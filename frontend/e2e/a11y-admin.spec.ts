import AxeBuilder from '@axe-core/playwright'
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
]

const status: AdminStatus = existsSync(ADMIN_STATUS)
  ? (JSON.parse(readFileSync(ADMIN_STATUS, 'utf8')) as AdminStatus)
  : { ok: false, reason: 'setup nije izvršen (nedostaje .auth/admin-status.json)' }

// Bez prijave admin rute redirektuju na /login, pa bi axe mjerio POGREŠNU stranicu i
// dao lažni prolaz. Zato se cijeli spec preskače, a ne samo pojedini testovi.
test.skip(!status.ok, `/admin/** nije testirano — ${status.reason}`)

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

test('2.4.1 admin: skip-link je prvi fokusabilni element', async ({ page }) => {
  await page.goto('/admin', { waitUntil: 'networkidle' })
  await page.keyboard.press('Tab')
  const focused = page.locator(':focus')
  await expect(focused).toHaveClass(/skip-link/)
})
