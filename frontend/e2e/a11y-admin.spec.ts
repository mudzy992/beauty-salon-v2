import AxeBuilder from '@axe-core/playwright'

import {
  AXE_RULE_TAGS,
  assertableViolations,
  defaultCoverageDir,
  recordAxeCoverage,
} from './axe-coverage.mjs'
import { expect, test, type Page } from '@playwright/test'
import { settleAnimations } from './settle'
import { existsSync, readFileSync } from 'node:fs'

import {
  activeElementIsSegmentedInput,
  activeElementLabel,
  clippedSnapshot,
  overflowingElements,
  focusableSnapshot,
  describeImageInventory,
  imageBearingInventory,
  inlineColorContrastViolations,
  probeFocusability,
  invalidWithoutDescription,
  labelInNameViolations,
  requiredNotMarked,
} from './dom-metrics.mjs'
import { analyzeTabTraversal, describeTraversal, tabPressesFor } from './tab-traversal.mjs'
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

// ── 2.5.3 Label in Name ──────────────────────────────────────────────────────
//
// Axe ovo pravilo NE MOŽE presuditi: na runu `42895442598` javljao je `incomplete 22/22`
// uz poruku „Unable to determine if the visible text is part of the accessible name", čak
// i nakon što je ime postalo „Admin meni, C". Zato se mjeri direktno — `aria-label` se
// upoređuje s `innerText` u stvarnom rasporedu. Ovo je upravo onih 22 rute gdje je defekt
// i nađen.
for (const route of ADMIN_ROUTES) {
  test(`2.5.3 admin: ime sadrži vidljivi tekst — ${route.name} (${route.path})`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'networkidle' })

    const bad = await page.evaluate(labelInNameViolations)
    if (bad.length) {
      process.stdout.write(
        `::error title=2.5.3 ${route.path} — ime ne sadrži vidljivi tekst::` +
          `${bad
            .slice(0, 4)
            .map((b) => `${b.element}: „${b.visible}" nije u „${b.name}"`)
            .join(' | ')}\n`,
      )
    }
    expect(bad, `${route.path}: pristupačno ime ne sadrži vidljivi tekst`).toEqual([])
  })
}

/** Anotacija s detaljem — isti mehanizam kao u 2.5.3 admin bloku. */
function reportAdmin(title: string, detail: string): void {
  const encoded = detail.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
  process.stdout.write(`::error title=${title}::${encoded}\n`)
}

// ── 3.3.3 Error suggestion ───────────────────────────────────────────────────
//
// Normativni zahtjev: ako je greška prepoznata i prijedlog ispravke poznat, prijedlog se
// korisniku daje **u tekstu**. Mjeri se na dnevnoj knjizi jer je to jedina forma koja ovo
// radi kroz `field-error.tsx`, a njena validacija je klijentska (`use-daily-log-form.ts:203`
// — prazan stilista/servis), pa test ne ovisi o backendu niti stvara podatke.
test('3.3.3 admin: prijedlog ispravke je tekst uz polje, s linkom iz sažetka', async ({ page }) => {
  await page.goto('/admin/daily-log', { waitUntil: 'networkidle' })

  await page.getByRole('button', { name: /novi unos/i }).first().click()
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: /sačuvaj/i }).first().click()
  await page.waitForTimeout(500)

  const summary = page.locator('[role="alert"][tabindex="-1"]').first()
  const summaryText = (await summary.innerText().catch(() => '')).trim()
  if (!summaryText) {
    reportAdmin(
      '3.3.3 /admin/daily-log — nema sažetka grešaka',
      'nakon pokušaja spremanja prazne forme nije se pojavio [role="alert"][tabindex="-1"]',
    )
  }
  await expect(summary, 'sažetak grešaka mora postojati i biti vidljiv').toBeVisible()

  // 1) Sažetak prima fokus — korisnik odmah zna da nešto treba ispraviti, ne traži to Tabom.
  const focusedRole = await page.evaluate(() => document.activeElement?.getAttribute('role'))
  expect(focusedRole, 'fokus mora biti na sažetku grešaka').toBe('alert')

  // 2) Svako neispravno polje ima pridružen tekst — ista mjera kao u 3.3.1.
  const bad = await page.evaluate(invalidWithoutDescription)
  if (bad.length) reportAdmin('3.3.3 /admin/daily-log — polje bez teksta', bad.map((b) => b.element).join(' | '))
  expect(bad, 'neispravno polje bez pridruženog teksta').toEqual([])

  // 3) Prijedlog je konkretan, ne generičan: govori ŠTA treba uraditi.
  expect(summaryText.toLowerCase(), 'sažetak mora sadržavati konkretan prijedlog').toContain(
    'odaberite stilistu i servis',
  )

  // 4) Linkovi iz sažetka vode na polja koja stvarno postoje — inače su mrtvi.
  const hrefs = await summary
    .locator('a[href^="#"]')
    .evaluateAll((nodes) => nodes.map((n) => String(n.getAttribute('href'))))
  expect(hrefs.length, 'sažetak mora linkovati na polja').toBeGreaterThan(0)
  for (const href of hrefs) {
    const target = await page.locator(href).count()
    if (target === 0) reportAdmin('3.3.3 /admin/daily-log — mrtav link', href)
    expect(target, `link ${href} vodi na nepostojeće polje`).toBeGreaterThan(0)
  }
})

test('2.4.1 admin: skip-link je prvi fokusabilni element', async ({ page }) => {
  await page.goto('/admin', { waitUntil: 'networkidle' })
  await page.keyboard.press('Tab')
  const focused = page.locator(':focus')
  await expect(focused).toHaveClass(/skip-link/)
})

// ── 3.3.1 Error identification / 3.3.2 Labels or instructions ────────────────
//
// Obje mjere su o VEZI, ne o postojanju teksta negdje na stranici: 3.3.1 traži da
// `aria-describedby` na neispravnom polju razriješi u element sa sadržajem, a 3.3.2 da
// vidljiva oznaka „obavezno" bude i programski vidljiva (`required`/`aria-required`), jer
// čitač ekrana zvjezdicu ne čita.
for (const route of ADMIN_ROUTES) {
  test(`3.3.1 admin: neispravno polje ima pridružen tekst — ${route.name} (${route.path})`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'networkidle' })

    // Na /login i /register se greška izazove stvarnim pokušajem slanja: mjerenje samog
    // učitanog stanja ne bi dokazalo ništa, jer tada nijedno polje još nije neispravno.
    if (route.path === '/login' || route.path === '/register') {
      await page.locator('form button[type="submit"]').first().click({ trial: false }).catch(() => {})
      await page.waitForTimeout(300)
    }

    const bad = await page.evaluate(invalidWithoutDescription)
    if (bad.length) {
      reportAdmin(`3.3.1 ${route.path} — aria-invalid bez teksta`, bad.slice(0, 4).map((b) => `${b.element} → ${b.describedby}`).join(' | '))
    }
    expect(bad, `${route.path}: neispravno polje bez pridruženog teksta`).toEqual([])
  })

  test(`3.3.2 admin: vidljiva oznaka obaveznog je i programski označena — ${route.name} (${route.path})`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'networkidle' })

    const bad = await page.evaluate(requiredNotMarked)
    if (bad.length) {
      reportAdmin(`3.3.2 ${route.path} — obavezno bez required`, bad.slice(0, 4).map((b) => `${b.element} „${b.label}"`).join(' | '))
    }
    expect(bad, `${route.path}: vidljiva oznaka obaveznog bez programskog oznake`).toEqual([])
  })
}

// ── 2.1.1 / 2.1.2 / 2.4.3 — stvarni Tab-prolazak kroz admin ─────────────────
//
// Javne rute ovo mjere u `wcag-rendered.spec.ts`; admin dosad NIJE bio pokriven, pa su
// 2.1.1 i 2.4.3 stajali na 🟡 upravo zbog toga. Bilježi se NIZ fokusiranih elemenata, ne
// skup: skup dokazuje dostižnost (2.1.1) a baca redoslijed, koji traži 2.4.3.
//
// Indikator fokusa se ovdje NAMJERNO ne provjerava po elementu (2.4.7 je dokazan nad
// izvorom, `focus-visible` ×162) — time je jedan round-trip po pritisku manje na stranicama
// koje imaju i po stotinjak fokusabilnih elemenata.
for (const route of ADMIN_ROUTES) {
  test(`2.1.1/2.4.3 admin: Tab-prolazak — ${route.name} (${route.path})`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'networkidle' })

    const expected: string[] = await page.evaluate(focusableSnapshot)
    const visited: (string | null)[] = []
    let previous: string | null = null
    let cycleStart: string | null = null
    for (let i = 0; i < tabPressesFor(expected.length); i += 1) {
      await page.keyboard.press('Tab')
      const label = await page.evaluate(activeElementLabel)
      // Native `<input type="date">` ima segmente u ZATVORENOM shadow DOM-u: Tab prebacuje
      // segment, a `document.activeElement` ostaje isti `<input>`. Izvana je to identično
      // zaglavljenom fokusu, pa se takav pritisak bilježi kao neodređen (`null`), što
      // `analyzeTabTraversal` već zna preskočiti. Bez toga bi 2.1.2 prijavio zamku na
      // svakoj formi s datumom (izmjereno: run 42966480987, 4 rute).
      const indeterminate =
        label !== null &&
        label === previous &&
        (await page.evaluate(activeElementIsSegmentedInput))
      visited.push(indeterminate ? null : label)
      // Petlja staje čim se ciklus zatvori — daljnji pritisci bi samo ponavljali isti krug.
      if (!indeterminate && label !== null) {
        if (cycleStart === null) cycleStart = label
        else if (label === cycleStart) break
      }
      previous = label
    }

    // Drugi snimak, na kraju prolaska: fokusabilnost se može promijeniti dok Tab ide kroz
    // stranicu, a o elementu koji više nije u tab nizu nema se šta presuđivati.
    // NAPOMENA: ovo NE rješava preostala 2 nalaza na kontejneru Radix tabliste
    // (`/admin/finance`, `/admin/users`) — run 42969095988 pokazuje da je kontejner i
    // dalje u drugom snimku, pa uzrok nije promjenjiva fokusabilnost.
    const stillFocusable: string[] = await page.evaluate(focusableSnapshot)
    // Sonda pita DOM direktno (`el.focus()` pa `document.activeElement === el`) za svaki
    // nedostignuti element. Bez toga se ne može razlikovati artefakt instrumenta od
    // stvarnog prekršaja 2.1.1: Radix kontejner tabliste ima `tabindex="0"`
    // (`react-roving-focus/dist/index.mjs:92`), ali mu `onFocus` odmah preusmjeri fokus na
    // aktivni tab, pa na njemu fokus nikad ne ostane.
    const firstPass = analyzeTabTraversal({ expected, visited, stillFocusable })
    const probes = firstPass.unvisited.length
      ? await page.evaluate(probeFocusability, firstPass.unvisited)
      : []
    const traversal = analyzeTabTraversal({
      expected,
      visited,
      stillFocusable,
      unfocusable: probes.filter((probe) => !probe.took).map((probe) => probe.label),
    })
    // Dokaz iz sonde ide uz nalaz, ne u zasebnu anotaciju: čitatelja zanima upravo zašto
    // je ovaj element ostao nedostignut.
    const probeEvidence = probes
      .filter((probe) => probe.took)
      .map((probe) => `${probe.label} (focus() prima; tabindex=${probe.tabindex}, u tablisti=${probe.inTablist})`)
      .join(' | ')

    if (traversal.unvisited.length) {
      reportAdmin(
        `2.1.1 ${route.path} — Tab ne doseže`,
        describeTraversal(traversal) + (probeEvidence ? ` · sonda: ${probeEvidence}` : ''),
      )
    }
    expect(
      traversal.unvisited,
      `${route.path}: Tab ne doseže ${traversal.unvisited.length} fokusabilnih elemenata`,
    ).toEqual([])

    // 2.1.2: fokus se ne smije zaglaviti. Dosad dokazano samo iz izvora („Radix fokus
    // trap"); sada je izmjereno pritiscima Tab.
    if (traversal.stuckAt) {
      reportAdmin(`2.1.2 ${route.path} — fokus zaglavljen`, describeTraversal(traversal))
    }
    expect(traversal.stuckAt, `${route.path}: fokus zaglavljen na "${traversal.stuckAt}"`).toBe(null)

    // 2.4.3: redoslijed fokusa prati DOM redoslijed. Pozitivni `tabindex` i vizuelno
    // preslagivanje bez preslagivanja DOM-a isplivaju upravo ovdje.
    if (traversal.orderMismatch) {
      reportAdmin(`2.4.3 ${route.path} — redoslijed fokusa`, describeTraversal(traversal))
    }
    expect(
      traversal.orderMismatch,
      `${route.path}: redoslijed fokusa ne prati DOM — ${describeTraversal(traversal)}`,
    ).toBe(null)
  })
}

// ── 1.4.5 Images of text — popis mjesta gdje bi tekst mogao biti slika ───────
//
// Da li neka **raster slika** sadrži tekst ne može se znati bez OCR-a ili čovjeka, pa ovo
// NE tvrdi usaglašenost. Mjeri se popis, da „nije provjereno" postane konačan i imenovan
// skup. Tvrdi se samo ono što je odlučivo: `<canvas>` mora biti 0, jer tekst u platnu je
// nevidljiv za AT a 1.4.5 za to nema izuzetak.
//
// Anotacija se ispisuje samo kad ima nečeg što vrijedi pogledati (`svg text`, `canvas`,
// `background-image` s URL-om) — `<img>` i `role="img"` su očekivani i pokriveni pod 1.1.1.
// `describeImageInventory` razdvaja tri vrste: `<canvas>` je prekršaj, raster u pozadini
// traži ljudsku procjenu, a `svg <text>` NIJE prekršaj jer je to pravi tekst u DOM-u. Bez
// te oznake bi `/admin/analytics` s 18 oznaka osa u grafikonu izgledao kao 18 nalaza.
for (const route of ADMIN_ROUTES) {
  test(`1.4.5 admin: popis mjesta gdje tekst može biti slika — ${route.name} (${route.path})`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'networkidle' })

    const inventory = await page.evaluate(imageBearingInventory, 4)
    const { counts } = inventory

    if (counts.svgText > 0 || counts.canvas > 0 || counts.bgImage > 0) {
      const detail = describeImageInventory(inventory)
      process.stdout.write(
        `::notice title=1.4.5 popis ${route.path}::` +
          `${detail.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')}\n`,
      )
    }

    expect(
      counts.canvas,
      `${route.path}: ${counts.canvas} <canvas> — tekst u platnu je nevidljiv za AT`,
    ).toBe(0)
  })
}

// ── 1.4.3 — kontrast teksta s inline bojom, tamo gdje axe odustane ───────────
//
// Axe `color-contrast` vraća **incomplete** kad ne može odrediti pozadinu: na
// `/admin/analytics` za tri čvora legende grafikona, jer Recharts stavlja SVG ikonu serije
// unutar `.recharts-legend-item-text` (run `43000853379`). Iza toga se krio stvarni
// prekršaj — boje serija na bijeloj kartici imaju 3.25:1, 4.13:1 i 2.39:1. Mjera računa
// kontrast sama i presuđuje; elemente s gradijentom ili slikom u pozadini preskače, jer tu
// ni ona ne može znati pozadinu.
for (const route of ADMIN_ROUTES) {
  test(`1.4.3 admin: inline boja teksta ima dovoljan kontrast — ${route.name} (${route.path})`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'networkidle' })

    const bad = await page.evaluate(inlineColorContrastViolations)
    if (bad.length) {
      const detail = bad
        .slice(0, 4)
        .map((b) => `${b.element} „${b.text}“ ${b.fg} na ${b.bg} = ${b.ratio}:1 (traži ${b.threshold}:1)`)
        .join(' | ')
      process.stdout.write(
        `::error title=1.4.3 ${route.path} — kontrast inline boje::` +
          `${detail.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')}\n`,
      )
    }

    expect(
      bad,
      `${route.path}: tekst s inline bojom ima premali kontrast — axe ovo javlja kao incomplete, ne kao nalaz`,
    ).toEqual([])
  })
}

// Explicit mode coverage for the S6 surfaces. Never accept a redirected login page
// or a different theme as evidence for an authenticated dashboard scan.
for (const mode of ['light', 'dark'] as const) {
  for (const path of ['/admin', '/admin/reservations', '/admin/reservations/calendar']) {
    test(`Aurum ${mode} admin rendered axe: ${path}`, async ({ page }) => {
      await page.addInitScript((selectedMode) => {
        localStorage.removeItem('nejra.theme')
        localStorage.setItem('nejra.theme.mode', selectedMode)
      }, mode)
      await page.route('**/api/settings/public', async (route) => {
        const response = await route.fetch()
        if (!response.ok()) throw new Error(`Public settings failed: ${response.status()}`)
        const rows = await response.json() as Array<{ key: string; value: string }>
        await route.fulfill({ response, json: [
          ...rows.filter((row) => row.key !== 'theme_active_skin' && row.key !== 'theme_default_mode'),
          { key: 'theme_active_skin', value: 'aurum' },
          { key: 'theme_default_mode', value: mode },
        ] })
      })
      await page.goto(path, { waitUntil: 'networkidle' })
      expect(new URL(page.url()).pathname).toBe(path)
      await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      const settled = await settleAnimations(page)
      expect(settled).not.toBeNull()
      expect(settled?.stillRunning).toBe(0)
      const results = await new AxeBuilder({ page }).withTags(AXE_RULE_TAGS).analyze()
      expect(assertableViolations(results.violations)).toEqual([])
    })
  }
}

for (const mode of ['light', 'dark'] as const) {
  test(`public authenticated account menu Aurum ${mode}`, async ({ page }) => {
    await page.addInitScript((selectedMode) => localStorage.setItem('nejra.theme.mode', selectedMode), mode)
    await page.route('**/api/settings/public', async (route) => {
      const response = await route.fetch()
      if (!response.ok()) throw new Error(`Public settings failed: ${response.status()}`)
      const rows = await response.json() as Array<{ key: string; value: string }>
      await route.fulfill({ response, json: [...rows.filter((row) => row.key !== 'theme_active_skin' && row.key !== 'theme_default_mode'), { key: 'theme_active_skin', value: 'aurum' }, { key: 'theme_default_mode', value: mode }] })
    })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
    const trigger = page.locator('[data-aurum-shell="header"] button[aria-haspopup="menu"]')
    await expect(trigger).toBeVisible()
    await trigger.focus()
    await page.keyboard.press('Enter')
    const menu = page.locator('[data-aurum-public-user-menu]')
    await expect(menu).toBeVisible()
    const colors = await menu.evaluate(el => {
      const probe = document.createElement('div')
      probe.style.backgroundColor = 'hsl(var(--surface))'
      el.appendChild(probe)
      const pair = { actual: getComputedStyle(el).backgroundColor, expected: getComputedStyle(probe).backgroundColor }
      probe.remove()
      return pair
    })
    expect(colors.actual).toBe(colors.expected)
    const results = await new AxeBuilder({ page }).include('[data-aurum-public-user-menu]').withTags(AXE_RULE_TAGS).analyze()
    const relevant = results.violations.filter((item) => item.tags.includes('wcag2aaa') || assertableViolations([item]).length > 0)
    console.log(`PUBLIC_USER_MENU_${mode.toUpperCase()} ${JSON.stringify(relevant.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })) })))}`)
    expect(relevant).toEqual([])
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
  })
}

for (const mode of ['light', 'dark'] as const) {
  test(`profile shell background follows Aurum ${mode}`, async ({ page }) => {
    await page.addInitScript((selectedMode) => localStorage.setItem('nejra.theme.mode', selectedMode), mode)
    await page.route('**/api/settings/public', async (route) => {
      const response = await route.fetch()
      const rows = await response.json() as Array<{ key: string; value: string }>
      await route.fulfill({ response, json: [...rows.filter((row) => row.key !== 'theme_active_skin' && row.key !== 'theme_default_mode'), { key: 'theme_active_skin', value: 'aurum' }, { key: 'theme_default_mode', value: mode }] })
    })
    await page.goto('/profil', { waitUntil: 'networkidle' })
    expect(new URL(page.url()).pathname).toBe('/profil')
    await expect(page.locator('[data-aurum-page="profile"]')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
    if (mode === 'dark') {
      const background = await page.locator('[data-public-shell]').evaluate((el) => getComputedStyle(el).backgroundColor)
      expect(background).not.toBe('rgb(255, 255, 255)')
    }
  })
}

for (const mode of ['light', 'dark'] as const) {
  for (const viewport of ['desktop', 'mobile'] as const) {
    test(`dashboard ${mode} ${viewport}: partial failure is not zero or empty data`, async ({ page }) => {
      await page.setViewportSize(viewport === 'desktop' ? { width: 1440, height: 900 } : { width: 320, height: 720 })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.addInitScript(value => localStorage.setItem('nejra.theme.mode', value), mode)
      await page.route('**/api/settings/public', async route => {
        const response = await route.fetch()
        const rows = await response.json() as Array<{ key: string; value: string }>
        await route.fulfill({ response, json: [...rows.filter(row => !['theme_active_skin', 'theme_default_mode'].includes(row.key)), { key: 'theme_active_skin', value: 'aurum' }, { key: 'theme_default_mode', value: mode }] })
      })
      await page.route('**/api/income-books/month/**', route => route.fulfill({ status: 503, json: {} }))
      await page.route('**/api/reservations/dashboard-summary**', route => route.fulfill({ status: 503, json: {} }))
      await page.goto('/admin', { waitUntil: 'networkidle' })
      expect(new URL(page.url()).pathname).toBe('/admin')
      const dashboard = page.locator('[data-admin-dashboard]')
      await expect(dashboard).toBeVisible()
      await expect(dashboard.getByRole('alert').first()).toBeVisible()
      await expect(dashboard.locator('[data-dashboard-finance]')).toContainText(/Nije dostupno|Unavailable/)
      await expect(dashboard.locator('[data-dashboard-operations]')).toContainText(/Nije dostupno|Unavailable/)
      await expect(dashboard.locator('[data-dashboard-recent]')).toContainText(/Nije dostupno|Unavailable/)
      await expect(dashboard.locator('[data-dashboard-recent]')).not.toContainText(/Nema rezervacija|No reservations/)
      const action = dashboard.locator('[data-dashboard-shortcuts] a').first()
      await action.focus()
      await expect(action).toBeFocused()
      await expect(action).toHaveAttribute('href', '/admin/reservations')
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
      await settleAnimations(page)
      const results = await new AxeBuilder({ page }).include('[data-admin-dashboard]').withTags(AXE_RULE_TAGS).analyze()
      console.log(`ADMIN_DASHBOARD_${mode}_${viewport} ${JSON.stringify({ violations: results.violations.map(v => ({ id: v.id, tags: v.tags, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: results.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) })}`)
      expect(assertableViolations(results.violations)).toEqual([])
    })
  }
}

for (const mode of ['light', 'dark'] as const) {
  test(`shared dashboard empty state uses Aurum surface and text tokens in ${mode}`, async ({ page }) => {
    await page.route('**/api/settings/public', async route => {
      const response = await route.fetch()
      const rows = await response.json() as Array<{ key: string; value: string }>
      await route.fulfill({ response, json: [...rows.filter(row => !['theme_active_skin', 'theme_default_mode'].includes(row.key)), { key: 'theme_active_skin', value: 'aurum' }, { key: 'theme_default_mode', value: mode }] })
    })
    await page.route('**/api/reservations/dashboard-summary**', route => route.fulfill({ json: { reservationsThisMonth: 0, pendingReservations: 0, completedReservations: 0, recentReservations: [] } }))
    await page.goto('/admin', { waitUntil: 'networkidle' })
    expect(new URL(page.url()).pathname).toBe('/admin')
    const state = page.locator('[data-dashboard-recent] [data-admin-state="empty"]')
    await expect(state).toBeVisible()
    const colors = await state.evaluate(element => {
      const root = getComputedStyle(document.documentElement)
      const resolve = (value: string) => {
        const probe = document.createElement('span')
        probe.style.color = `hsl(${value})`
        document.body.append(probe)
        const result = getComputedStyle(probe).color
        probe.remove()
        return result
      }
      return { background: getComputedStyle(element).backgroundColor, surface: resolve(root.getPropertyValue('--surface')), text: getComputedStyle(element.querySelector('p')!).color, expectedText: resolve(root.getPropertyValue('--text-muted-strong')) }
    })
    expect(colors.background).toBe(colors.surface)
    expect(colors.text).toBe(colors.expectedText)
    const results = await new AxeBuilder({ page }).include('[data-dashboard-recent]').withTags([...AXE_RULE_TAGS, 'wcag2aaa']).analyze()
    expect(results.violations).toEqual([])
    console.log(`ADMIN_EMPTY_${mode}_INCOMPLETE ${JSON.stringify(results.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })))}`)
  })
}

for (const mode of ['light', 'dark'] as const) {
  for (const viewport of ['desktop', 'mobile'] as const) {
    test(`admin shell ${mode} ${viewport}: navigation and user menus`, async ({ page }) => {
      await page.setViewportSize(viewport === 'desktop' ? { width: 1440, height: 900 } : { width: 320, height: 720 })
      await page.addInitScript(value => { localStorage.removeItem('nejra.theme'); localStorage.setItem('nejra.theme.mode', value) }, mode)
      await page.route('**/api/settings/public', async route => {
        const response = await route.fetch()
        const rows = await response.json() as Array<{ key: string; value: string }>
        await route.fulfill({ response, json: [...rows.filter(row => !['theme_active_skin', 'theme_default_mode'].includes(row.key)), { key: 'theme_active_skin', value: 'aurum' }, { key: 'theme_default_mode', value: mode }] })
      })
      await page.route('**/api/blog/comments/pending-count', route => route.fulfill({ json: { pending: 0 } }))
      await page.goto('/admin', { waitUntil: 'networkidle' })
      expect(new URL(page.url()).pathname).toBe('/admin')
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      const trigger = viewport === 'mobile' ? page.locator('button[aria-controls="admin-mobile-navigation"]') : page.locator('header[data-admin-header] button[aria-haspopup="menu"]')
      await trigger.focus()
      await page.keyboard.press('Enter')
      const container = viewport === 'mobile' ? page.locator('#admin-mobile-navigation') : page.locator('[data-admin-user-menu]')
      await expect(container).toBeVisible()
      const siteLink = container.locator('a[href="/"]')
      await expect(siteLink).toHaveCount(1)
      await expect(siteLink.locator('button')).toHaveCount(0)
      const background = await container.evaluate(element => {
        const probe = document.createElement('span')
        probe.style.backgroundColor = 'hsl(var(--surface))'
        element.append(probe)
        const result = { actual: getComputedStyle(element).backgroundColor, expected: getComputedStyle(probe).backgroundColor }
        probe.remove()
        return result
      })
      expect(background.actual).toBe(background.expected)
      await page.keyboard.press('Escape')
      await expect(trigger).toBeFocused()
      const navigation = viewport === 'mobile' ? page.locator('#admin-mobile-navigation [data-admin-navigation]') : page.locator('[data-admin-sidebar] [data-admin-navigation]')
      if (viewport === 'mobile') { await trigger.click(); await expect(navigation).toBeVisible() }
      await expect(navigation.locator('a[href="/admin/settings"]')).toHaveCount(1)
      await expect(navigation.locator('a[href^="/admin/settings?tab="]')).toHaveCount(0)
      await expect(navigation.locator('a[href="/admin/stylists"]')).toHaveCount(1)
      await expect(navigation.locator('a[href="/admin/users"]')).toHaveCount(1)
      const results = await new AxeBuilder({ page }).include(viewport === 'mobile' ? '#admin-mobile-navigation [data-admin-navigation]' : '[data-admin-sidebar] [data-admin-navigation]').withTags([...AXE_RULE_TAGS, 'wcag2aaa']).analyze()
      console.log(`ADMIN_NAV_${mode}_${viewport} ${JSON.stringify({ violations: results.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: results.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) })}`)
      expect(results.violations).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    })
  }
}

for (const mode of ['light', 'dark'] as const) {
  for (const path of ['/admin/reservations', '/admin/users', '/admin/services']) {
    test(`default shared Card surface follows Aurum ${mode}: ${path}`, async ({ page }) => {
      await page.addInitScript(value => { localStorage.removeItem('nejra.theme'); localStorage.setItem('nejra.theme.mode', value) }, mode)
      await page.route('**/api/settings/public', async route => {
        const response = await route.fetch()
        const rows = await response.json() as Array<{ key: string; value: string }>
        await route.fulfill({ response, json: [...rows.filter(row => !['theme_active_skin', 'theme_default_mode'].includes(row.key)), { key: 'theme_active_skin', value: 'aurum' }, { key: 'theme_default_mode', value: mode }] })
      })
      if (path === '/admin/services') {
        await page.route('**/api/services/admin/categories**', route => route.fulfill({ json: [{ id: 'fixture-category', name: 'Primjer kategorije', description: null, sortOrder: 0, isActive: true }] }))
        await page.route('**/api/services/admin/subcategories**', route => route.fulfill({ json: [] }))
        await page.route('**/api/services/admin/services**', route => route.fulfill({ json: [] }))
      }
      await page.goto(path, { waitUntil: 'networkidle' })
      expect(new URL(page.url()).pathname).toBe(path)
      await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      const cards = page.locator('.admin-shell [data-default-card-surface]')
      await expect(cards.first()).toBeVisible()
      const colors = await cards.evaluateAll(elements => {
        const probe = document.createElement('span')
        probe.style.backgroundColor = 'hsl(var(--surface))'
        document.body.append(probe)
        const expected = getComputedStyle(probe).backgroundColor
        probe.remove()
        return elements.filter(element => element.getClientRects().length > 0).map(element => ({ actual: getComputedStyle(element).backgroundColor, expected }))
      })
      expect(colors.length).toBeGreaterThan(0)
      for (const pair of colors) expect(pair.actual).toBe(pair.expected)
    })
  }
}

for (const mode of ['light', 'dark'] as const) {
  for (const viewport of ['desktop', 'mobile'] as const) {
    test(`users shared controls and populated card use Aurum tokens: ${mode} ${viewport}`, async ({ page }) => {
      await page.setViewportSize(viewport === 'desktop' ? { width: 1440, height: 900 } : { width: 320, height: 720 })
      await page.addInitScript(value => { localStorage.removeItem('nejra.theme'); localStorage.setItem('nejra.theme.mode', value) }, mode)
      await page.route('**/api/settings/public', async route => {
        const response = await route.fetch()
        const rows = await response.json() as Array<{ key: string; value: string }>
        await route.fulfill({ response, json: [...rows.filter(row => !['theme_active_skin', 'theme_default_mode'].includes(row.key)), { key: 'theme_active_skin', value: 'aurum' }, { key: 'theme_default_mode', value: mode }] })
      })
      await page.route('**/api/users/system-admins**', route => route.fulfill({ json: [] }))
      await page.route('**/api/users/stylists**', route => route.fulfill({ json: [] }))
      await page.route('**/api/users/password-reset-candidates**', route => route.fulfill({ json: [] }))
      await page.route('**/api/users/clients/admin**', route => route.fulfill({ json: { items: [{ id: 'fixture-client', username: 'primjer.klijent', email: 'fixture@example.test', firstName: 'Primjer', lastName: 'Klijent', phone: null, gender: 'FEMALE', avatar: null, isActive: true, isEmailVerified: true, createdAt: '2026-01-01T00:00:00Z', userRoles: [{ role: { name: 'CLIENT' } }] }], total: 1, page: 0, pageSize: 20 } }))
      await page.goto('/admin/users', { waitUntil: 'networkidle' })
      expect(new URL(page.url()).pathname).toBe('/admin/users')
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      const root = page.locator('[data-admin-users]')
      await expect(root.locator('p:visible, span:visible').filter({ hasText: 'primjer.klijent' }).first()).toBeVisible()
      const tabs = root.locator('[data-admin-tabs-list]')
      const field = root.locator('[data-default-admin-field]').first()
      const chip = root.locator('[data-users-role-chip]:visible').first()
      await expect(chip).toBeVisible()
      const pairs = await Promise.all([tabs, field, chip].map(locator => locator.evaluate(element => {
        const probe = document.createElement('span')
        const token = element.hasAttribute('data-default-admin-field') ? '--surface' : '--surface-muted'
        probe.style.backgroundColor = `hsl(var(${token}))`
        document.body.append(probe)
        const result = { actual: getComputedStyle(element).backgroundColor, expected: getComputedStyle(probe).backgroundColor }
        probe.remove()
        return result
      })))
      for (const pair of pairs) expect(pair.actual).toBe(pair.expected)
      const activeTab = tabs.locator('[role="tab"][aria-selected="true"]')
      await expect(activeTab).toBeVisible()
      await field.fill('primjer')
      const results = await new AxeBuilder({ page }).include('[data-admin-tabs-list]').include('[data-default-admin-field]').withTags([...AXE_RULE_TAGS, 'wcag2aaa']).analyze()
      console.log(`ADMIN_USERS_CONTROLS_${mode}_${viewport} ${JSON.stringify({ violations: results.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: results.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) })}`)
      expect(results.violations).toEqual([])
      const pageAxe = await new AxeBuilder({ page }).include('[data-admin-users]').withTags([...AXE_RULE_TAGS, 'wcag2aaa']).analyze()
      console.log(`USERS_POPULATED_${mode}_${viewport} ${JSON.stringify({ violations: pageAxe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: pageAxe.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) })}`)
      expect(pageAxe.violations).toEqual([])
      const selectedLabel = await activeTab.textContent()
      await activeTab.focus()
      await page.keyboard.press('ArrowLeft')
      await expect(tabs.locator('[role="tab"][aria-selected="true"]')).not.toHaveText(selectedLabel ?? '')
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    })
  }
}

for (const mode of ['light', 'dark'] as const) {
  for (const viewport of ['desktop', 'mobile'] as const) {
    test(`users load failure, retry and create dialog: ${mode} ${viewport}`, async ({ page }) => {
      await page.setViewportSize(viewport === 'desktop' ? { width: 1440, height: 900 } : { width: 320, height: 720 })
      await page.addInitScript(value => { localStorage.removeItem('nejra.theme'); localStorage.setItem('nejra.theme.mode', value) }, mode)
      await page.route('**/api/settings/public', async route => {
        const response = await route.fetch()
        const rows = await response.json() as Array<{ key: string; value: string }>
        await route.fulfill({ response, json: [...rows.filter(row => !['theme_active_skin', 'theme_default_mode'].includes(row.key)), { key: 'theme_active_skin', value: 'aurum' }, { key: 'theme_default_mode', value: mode }] })
      })
      await page.route('**/api/users/system-admins**', route => route.fulfill({ json: [] }))
      await page.route('**/api/users/stylists**', route => route.fulfill({ json: [] }))
      await page.route('**/api/users/password-reset-candidates**', route => route.fulfill({ json: [] }))
      let fail = true
      await page.route('**/api/users/clients/admin**', route => fail
        ? route.fulfill({ status: 503, json: {} })
        : route.fulfill({ json: { items: [{ id: 'fixture-client', username: 'primjer.klijent', email: 'fixture@example.test', firstName: 'Primjer', lastName: 'Klijent', phone: null, gender: 'FEMALE', avatar: null, isActive: true, isEmailVerified: true, createdAt: '2026-01-01T00:00:00Z', userRoles: [{ role: { name: 'CLIENT' } }] }], total: 1, page: 0, pageSize: 20 } }))
      await page.goto('/admin/users', { waitUntil: 'networkidle' })
      expect(new URL(page.url()).pathname).toBe('/admin/users')
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      const root = page.locator('[data-admin-users]')
      const alert = root.getByRole('alert')
      await expect(alert).toContainText(/Nije moguće učitati korisnike|Could not load users/)
      await expect(root.locator('[role="tablist"]')).toHaveCount(0)
      const errorAxe = await new AxeBuilder({ page }).include('[data-admin-users] [data-admin-state="error"]').withTags([...AXE_RULE_TAGS, 'wcag2aaa']).analyze()
      console.log(`USERS_ERROR_${mode}_${viewport} ${JSON.stringify({ violations: errorAxe.violations, incomplete: errorAxe.incomplete.map(v => v.id) })}`)
      expect(errorAxe.violations).toEqual([])
      fail = false
      await alert.getByRole('button').click()
      await expect(root.locator('p:visible, span:visible').filter({ hasText: 'primjer.klijent' }).first()).toBeVisible()
      const roleBadge = root.locator('[data-users-role-chip]:visible [data-ui-badge="success"]').first()
      await expect(roleBadge).toBeVisible()
      const create = root.getByRole('button', { name: /novi korisnik|new user|kreiraj korisnika|create user/i }).first()
      await expect(create).toBeVisible()
      await create.click()
      const dialog = page.locator('[data-users-dialog][role="dialog"]')
      await expect(dialog).toBeVisible()
      await dialog.locator('#users-auth-first-name-2').fill('Primjer')
      const colors = await dialog.locator('#users-auth-first-name-2, #users-create-gender').evaluateAll(elements => {
        const probe = document.createElement('span')
        probe.style.backgroundColor = 'hsl(var(--surface))'
        document.body.append(probe)
        const expected = getComputedStyle(probe).backgroundColor
        probe.remove()
        return elements.map(el => ({ actual: getComputedStyle(el).backgroundColor, expected }))
      })
      for (const pair of colors) expect(pair.actual).toBe(pair.expected)
      const dialogAxe = await new AxeBuilder({ page }).include('[data-users-dialog]').withTags([...AXE_RULE_TAGS, 'wcag2aaa']).analyze()
      console.log(`USERS_CREATE_${mode}_${viewport} ${JSON.stringify({ violations: dialogAxe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: dialogAxe.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) })}`)
      expect(dialogAxe.violations).toEqual([])
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    })
  }
}

test('dashboard rejects malformed successful responses and recovers on retry', async ({ page }) => {
  let malformed = true
  await page.route('**/api/users/dashboard-count', route => route.fulfill({ json: malformed ? {} : { total: 17 } }))
  await page.route('**/api/reservations/dashboard-summary**', route => route.fulfill({ json: malformed ? { recentReservations: [] } : { reservationsThisMonth: 2, completedReservations: 1, pendingReservations: 1, recentReservations: [] } }))
  await page.goto('/admin', { waitUntil: 'networkidle' })
  const dashboard = page.locator('[data-admin-dashboard]')
  await expect(dashboard).toBeVisible()
  await expect(dashboard.locator('[data-dashboard-recent]')).toContainText(/Nije dostupno|Unavailable/)
  await expect(dashboard.locator('[data-dashboard-operations]')).toContainText(/Nije dostupno|Unavailable/)
  malformed = false
  await dashboard.getByRole('alert').first().getByRole('button').click()
  await expect(dashboard.locator('[data-dashboard-operations]')).toContainText('17')
  await expect(dashboard.locator('[data-dashboard-recent]')).toContainText(/Nema rezervacija|No reservations/)
})

// For axe incomplete results, measure the actual computed text/background pair,
// compositing transparent ancestors. This complements, not replaces, manual review.
async function computedContrast(locator: import('@playwright/test').Locator) {
  return locator.evaluateAll(elements => elements.map(element => {
    const color = (value: string) => {
      const numbers = value.match(/[\d.]+/g)?.map(Number)
      if (!numbers || numbers.length < 3) throw new Error(`Unsupported color ${value}`)
      return [numbers[0], numbers[1], numbers[2], numbers[3] ?? 1]
    }
    const blend = (front: number[], back: number[]) => front.slice(0, 3).map((v, i) => v * front[3] + back[i] * (1 - front[3]))
    const layers: number[][] = []
    let node: Element | null = element
    while (node) {
      const style = getComputedStyle(node)
      if (style.backgroundImage !== 'none') throw new Error('Background image requires manual contrast review')
      layers.push(color(style.backgroundColor))
      node = node.parentElement
    }
    let background = [255, 255, 255]
    for (const layer of layers.reverse()) background = blend(layer, background)
    const foreground = blend(color(getComputedStyle(element).color), background)
    const luminance = (rgb: number[]) => rgb.map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
    const a = luminance(foreground), b = luminance(background)
    return { text: element.textContent, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) }
  }))
}

for (const mode of ['light', 'dark'] as const) {
  for (const viewport of ['desktop', 'mobile'] as const) {
    test(`dashboard populated and outbox replay ${mode} ${viewport}`, async ({ page }) => {
      await page.setViewportSize(viewport === 'desktop' ? { width: 1440, height: 900 } : { width: 320, height: 720 })
      await page.addInitScript(value => localStorage.setItem('nejra.theme.mode', value), mode)
      await page.route('**/api/settings/public', async route => {
        const response = await route.fetch()
        const rows = await response.json() as Array<{ key: string; value: string }>
        await route.fulfill({ response, json: [...rows.filter(row => !['theme_active_skin', 'theme_default_mode'].includes(row.key)), { key: 'theme_active_skin', value: 'aurum' }, { key: 'theme_default_mode', value: mode }] })
      })
      await page.route('**/api/users/dashboard-count', route => route.fulfill({ json: { total: 14 } }))
      await page.route('**/api/stylists?**', route => route.fulfill({ json: { total: 3 } }))
      await page.route('**/api/services?**', route => route.fulfill({ json: { total: 8 } }))
      await page.route('**/api/income-books/month/**', route => route.fulfill({ json: { totalRevenue: '1400.00', totalTips: '100.00' } }))
      await page.route('**/api/expense-books/month/**', route => route.fulfill({ json: { expenses: [{ totalAmount: '500.00' }] } }))
      await page.route('**/api/reviews/admin?**', route => route.fulfill({ json: [{ id: 'review-1' }] }))
      await page.route('**/api/blog/admin', route => route.fulfill({ json: [{ id: 'blog-1' }] }))
      await page.route('**/api/reservations/dashboard-summary**', route => route.fulfill({ json: { reservationsThisMonth: 8, completedReservations: 5, pendingReservations: 2, recentReservations: [{ id: 'reservation-fixture', reservationDate: '2026-01-01', startTime: '10:30', status: 'CONFIRMED', client: { id: 'client-fixture', firstName: 'Primjer', lastName: 'Klijent' }, service: { name: 'Test usluga' } }] } }))
      let failedRefresh = false
      let replayRequests = 0
      await page.route('**/api/reservations/ops/outbox**', async route => {
        if (route.request().method() === 'POST') {
          replayRequests += 1
          expect(route.request().postDataJSON()).toEqual({ confirmAtLeastOnce: true })
          await route.fulfill({ json: { ok: true } })
        } else if (failedRefresh) await route.fulfill({ status: 503, json: {} })
        else await route.fulfill({ json: { generatedAt: '2026-01-01T12:00:00Z', counts: { DEAD_LETTER: 1 }, duePending: 0, staleProcessing: 0, recentEvents: [{ id: 'event-fixture', eventType: 'reservation.created', status: 'DEAD_LETTER', attempts: 3, nextAttemptAt: '2026-01-01T12:00:00Z', lockedAt: null, lastError: 'Delivery failed (Timeout).', createdAt: '2026-01-01T12:00:00Z', updatedAt: '2026-01-01T12:00:00Z' }] } })
      })
      await page.goto('/admin', { waitUntil: 'networkidle' })
      expect(new URL(page.url()).pathname).toBe('/admin')
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      const dashboard = page.locator('[data-admin-dashboard]')
      const outbox = dashboard.locator('[data-dashboard-outbox]')
      await expect(dashboard.locator('[data-dashboard-recent]')).toContainText('Primjer Klijent')
      await expect(outbox).toContainText('reservation.created')
      const results = await new AxeBuilder({ page }).include('[data-admin-dashboard]').withTags([...AXE_RULE_TAGS, 'wcag2aaa']).analyze()
      console.log(`DASHBOARD_POPULATED_${mode}_${viewport} ${JSON.stringify({ violations: results.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: results.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) })}`)
      expect(results.violations).toEqual([])
      const replay = outbox.getByRole('button', { name: /Ponovi isporuku za događaj|Replay.*event/i })
      await replay.click()
      const dialog = page.locator('[data-dashboard-replay-dialog]')
      await expect(dialog).toBeVisible()
      const confirm = dialog.getByRole('button', { name: /Potvrdi ponovno slanje|Confirm replay/i })
      await expect(confirm).toBeDisabled()
      expect(replayRequests).toBe(0)
      await dialog.getByRole('checkbox').check()
      await expect(confirm).toBeEnabled()
      await settleAnimations(page)
      const dialogResults = await new AxeBuilder({ page }).include('[data-dashboard-replay-dialog]').withTags([...AXE_RULE_TAGS, 'wcag2aaa']).analyze()
      console.log(`DASHBOARD_REPLAY_${mode}_${viewport} ${JSON.stringify({ violations: dialogResults.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: dialogResults.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) })}`)
      expect(dialogResults.violations).toEqual([])
      const dialogCopy = dialog.locator('p[id], [role="alert"] > div, label span')
      await expect(dialogCopy).toHaveCount(3)
      for (const item of await computedContrast(dialogCopy)) expect(item.ratio, String(item.text)).toBeGreaterThanOrEqual(7)
      await confirm.click()
      await expect(dialog).toBeHidden()
      expect(replayRequests).toBe(1)
      failedRefresh = true
      await outbox.getByRole('button', { name: /Osvježi|Refresh/i }).click()
      await expect(outbox).toContainText(/Dijagnostiku nije moguće učitati|Unable to load diagnostics/i)
      await expect(outbox).not.toContainText('reservation.created')
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    })
  }
}

test('dashboard announces reduced-motion loading and recovers from complete failure', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  let fail = true
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const dashboardEndpoints = /\/api\/(users\/dashboard-count|stylists|services|reservations\/dashboard-summary|income-books\/month\/[^/]+\/[^/?]+|expense-books\/month\/[^/]+\/[^/?]+|reviews\/admin|blog\/admin)(?:\?|$)/
  await page.route(dashboardEndpoints, async route => {
    if (!fail) return route.continue()
    await gate
    await route.fulfill({ status: 503, json: {} })
  })
  await page.goto('/admin', { waitUntil: 'domcontentloaded' })
  const loading = page.getByRole('status').filter({ has: page.locator('.animate-pulse') })
  await expect(loading).toBeVisible()
  expect(await loading.locator('.animate-pulse').first().evaluate(el => getComputedStyle(el).animationName)).toBe('none')
  release()
  const error = page.getByRole('alert').filter({ hasText: /Podaci za nadzornu ploču nisu dostupni|Dashboard data is unavailable/i })
  await expect(error).toBeVisible()
  await expect(page.locator('[data-dashboard-finance]')).toHaveCount(0)
  fail = false
  await error.getByRole('button').click()
  await expect(page.locator('[data-admin-dashboard]')).toBeVisible()
})

for (const mode of ['light', 'dark'] as const) {
  for (const viewport of ['desktop', 'mobile'] as const) {
    test(`users edit and multi-category stylist removal ${mode} ${viewport}`, async ({ page }) => {
      await page.setViewportSize(viewport === 'desktop' ? { width: 1440, height: 900 } : { width: 320, height: 720 })
      await page.addInitScript(value => { localStorage.removeItem('nejra.theme'); localStorage.setItem('nejra.theme.mode', value) }, mode)
      await page.route('**/api/settings/public', async route => {
        const response = await route.fetch()
        const rows = await response.json() as Array<{ key: string; value: string }>
        await route.fulfill({ response, json: [...rows.filter(row => !['theme_active_skin', 'theme_default_mode'].includes(row.key)), { key: 'theme_active_skin', value: 'aurum' }, { key: 'theme_default_mode', value: mode }] })
      })
      const user = { id: 'fixture-user', username: 'test.stilist', email: 'test@example.test', firstName: 'Test', lastName: 'Stilist', phone: null, gender: 'FEMALE', avatar: null, isActive: true, isEmailVerified: true, createdAt: '2026-01-01T00:00:00Z', userRoles: [{ role: { name: 'CLIENT' } }, { role: { name: 'STYLIST' } }], stylistProfile: { id: 'stylist-one', status: 'ACTIVE' } }
      await page.route('**/api/users/system-admins**', route => route.fulfill({ json: [] }))
      await page.route('**/api/users/stylists**', route => route.fulfill({ json: [] }))
      await page.route('**/api/users/password-reset-candidates**', route => route.fulfill({ json: [] }))
      await page.route('**/api/users/clients/admin**', route => route.fulfill({ json: { items: [user], total: 1, page: 0, pageSize: 20 } }))
      await page.route('**/api/client-debts**', route => route.fulfill({ json: [] }))
      await page.route('**/api/users/fixture-user/stylist-removal-preview', route => route.fulfill({ json: { stylistProfileId: 'stylist-one', financial: { clientDebtsCount: 0, manualIncomeCount: 0, bookedDailyLogsCount: 0 }, revision: 'a'.repeat(64), counts: { dailyLogEntriesCount: 2, confirmedReservationsCount: 1, reservationResponsesCount: 0, reviewsCount: 0 } } }))
      await page.route('**/api/stylists/admin**', route => route.fulfill({ json: [{ id: 'stylist-two', user: { isActive: true, username: 'drugi' }, status: 'ACTIVE', isActive: true }] }))
      await page.goto('/admin/users', { waitUntil: 'networkidle' })
      const root = page.locator('[data-admin-users]')
      await expect(root.locator('p:visible, span:visible').filter({ hasText: 'test.stilist' }).first()).toBeVisible()
      const edit = root.getByRole('button', { name: /uredi korisnika test.stilist|edit user test.stilist/i })
      await edit.click()
      const dialog = page.locator('[data-users-dialog][role="dialog"]')
      await expect(dialog.getByRole('switch')).toHaveAccessibleName(/aktivan|active/i)
      await expect(dialog.locator('#users-gender')).toHaveAttribute('aria-required', 'true')
      const editAxe = await new AxeBuilder({ page }).include('[data-users-dialog]').withTags(AXE_RULE_TAGS).analyze()
      console.log(`USERS_EDIT_${mode}_${viewport} ${JSON.stringify({ violations: editAxe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: editAxe.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) })}`)
      expect(assertableViolations(editAxe.violations)).toEqual([])
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      const removeRole = root.getByRole('button', { name: /ukloni ulogu.*stilist|remove.*stylist/i }).first()
      await removeRole.click()
      await expect(dialog).toBeVisible()
      await expect(dialog.locator('fieldset')).toHaveCount(2)
      await expect(dialog.locator('fieldset legend').first()).not.toBeEmpty()
      const removalAxe = await new AxeBuilder({ page }).include('[data-users-dialog]').withTags([...AXE_RULE_TAGS, 'wcag2aaa']).analyze()
      console.log(`USERS_REMOVAL_${mode}_${viewport} ${JSON.stringify({ violations: removalAxe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: removalAxe.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) })}`)
      expect(removalAxe.violations).toEqual([])
      const selects = dialog.locator('select[id^="users-stylist-removal-target-"]')
      await expect(selects).toHaveCount(2)
      const labels = await selects.evaluateAll(elements => elements.map(el => ({ id: el.id, labels: (el as HTMLSelectElement).labels?.length ?? 0 })))
      expect(new Set(labels.map(item => item.id)).size).toBe(2)
      expect(labels.map(item => item.labels)).toEqual([1, 1])
      await selects.nth(0).selectOption('stylist-two')
      await selects.nth(1).selectOption('stylist-two')
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      await expect(removeRole).toBeFocused()
    })
  }
}

test('users debt write-off can retry after a failed request without duplicate submission', async ({ page }) => {
  const user = { id: 'fixture-client', username: 'primjer.klijent', email: null, firstName: 'Primjer', lastName: 'Klijent', phone: null, gender: 'FEMALE', avatar: null, isActive: true, isEmailVerified: false, createdAt: '2026-01-01T00:00:00Z', userRoles: [{ role: { name: 'CLIENT' } }] }
  await page.route('**/api/users/system-admins**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/stylists**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/password-reset-candidates**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/clients/admin**', route => route.fulfill({ json: { items: [user], total: 1, page: 0, pageSize: 20 } }))
  await page.route('**/api/client-debts?**', route => route.fulfill({ json: [{ id: 'debt-fixture', amount: '15', createdAt: '2026-01-01T00:00:00Z' }] }))
  let attempts = 0
  await page.route('**/api/client-debts/debt-fixture/write-off', route => {
    attempts += 1
    expect(route.request().postDataJSON()).toEqual({ note: 'Test razlog' })
    return route.fulfill(attempts === 1 ? { status: 503, json: {} } : { json: { ok: true } })
  })
  await page.goto('/admin/users', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /uredi korisnika primjer.klijent|edit user primjer.klijent/i }).click()
  const edit = page.locator('[data-users-dialog][role="dialog"]')
  await edit.getByRole('button', { name: /otpiši dug|write off/i }).click()
  const confirmDialog = page.getByRole('dialog', { name: /otpis duga|write off debt/i })
  await confirmDialog.getByRole('textbox').fill('Test razlog')
  const confirm = confirmDialog.getByRole('button', { name: /otpiši dug|write off/i })
  await confirm.click()
  await expect.poll(() => attempts).toBe(1)
  await expect(confirm).toBeEnabled()
  await confirm.click()
  await expect.poll(() => attempts).toBe(2)
  await expect(confirmDialog).toBeHidden()
})

test('users username availability ignores an older delayed response', async ({ page }) => {
  await page.route('**/api/users/system-admins**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/stylists**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/password-reset-candidates**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/clients/admin**', route => route.fulfill({ json: { items: [], total: 0, page: 0, pageSize: 20 } }))
  let releaseOld!: () => void
  const oldGate = new Promise<void>(resolve => { releaseOld = resolve })
  await page.route('**/api/users/username-availability?**', async route => {
    const name = new URL(route.request().url()).searchParams.get('username')
    if (name === 'staro.ime') {
      await oldGate
      await route.fulfill({ json: { available: false, suggestions: [] } })
    } else await route.fulfill({ json: { available: true, suggestions: [] } })
  })
  await page.goto('/admin/users', { waitUntil: 'networkidle' })
  await page.locator('[data-admin-users]').getByRole('button', { name: /novi korisnik|new user|kreiraj korisnika|create user/i }).click()
  const dialog = page.locator('[data-users-dialog][role="dialog"]')
  const username = dialog.locator('#users-users-username-2')
  const oldRequest = page.waitForRequest(request => request.url().includes('username=staro.ime'))
  await username.fill('staro.ime')
  await oldRequest
  const newRequest = page.waitForResponse(response => response.url().includes('username=novo.ime'))
  await username.fill('novo.ime')
  await newRequest
  await expect(dialog).toContainText(/Korisničko ime je dostupno|Username is available/i)
  const oldResponse = page.waitForResponse(response => response.url().includes('username=staro.ime'))
  releaseOld()
  await oldResponse
  await expect(dialog).not.toContainText(/Korisničko ime nije dostupno|Username is unavailable/i)
  await expect(dialog).toContainText(/Korisničko ime je dostupno|Username is available/i)
})

test('removing a stylist with no linked records still requires explicit confirmation', async ({ page }) => {
  const user = { id: 'fixture-user', username: 'test.stilist', email: null, firstName: 'Test', lastName: 'Stilist', phone: null, gender: 'FEMALE', avatar: null, isActive: true, isEmailVerified: false, createdAt: '2026-01-01T00:00:00Z', userRoles: [{ role: { name: 'CLIENT' } }, { role: { name: 'STYLIST' } }], stylistProfile: { id: 'stylist-one', status: 'ACTIVE' } }
  await page.route('**/api/users/system-admins**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/stylists**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/password-reset-candidates**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/clients/admin**', route => route.fulfill({ json: { items: [user], total: 1, page: 0, pageSize: 20 } }))
  await page.route('**/api/users/fixture-user/stylist-removal-preview', route => route.fulfill({ json: { stylistProfileId: 'stylist-one', financial: { clientDebtsCount: 0, manualIncomeCount: 0, bookedDailyLogsCount: 0 }, revision: 'a'.repeat(64), counts: { dailyLogEntriesCount: 0, confirmedReservationsCount: 0, reservationResponsesCount: 0, reviewsCount: 0 } } }))
  let removals = 0
  await page.route('**/api/users/fixture-user/remove-stylist-role', route => { removals += 1; expect(route.request().postDataJSON().previewRevision).toBe('a'.repeat(64)); return route.fulfill({ json: { ok: true } }) })
  await page.goto('/admin/users', { waitUntil: 'networkidle' })
  const remove = page.locator('[data-admin-users]').getByRole('button', { name: /ukloni ulogu.*stilist|remove.*stylist/i }).first()
  await remove.click()
  const dialog = page.getByRole('dialog', { name: /ukloni ulogu stiliste|remove stylist role/i })
  const confirm = dialog.getByRole('button', { name: /ukloni ulogu stiliste|remove stylist role/i })
  await expect(confirm).toBeEnabled()
  expect(removals).toBe(0)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(remove).toBeFocused()
  expect(removals).toBe(0)
  await remove.click()
  await expect(confirm).toBeEnabled()
  await confirm.click()
  await expect.poll(() => removals).toBe(1)
  await expect(dialog).toBeHidden()
})

test('users create shows one-time credentials and clears them after acknowledgment', async ({ page }) => {
  await page.route('**/api/users/system-admins**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/stylists**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/password-reset-candidates**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/clients/admin**', route => route.fulfill({ json: { items: [], total: 0, page: 0, pageSize: 20 } }))
  await page.route('**/api/users/username-availability?**', route => route.fulfill({ json: { available: true, suggestions: [] } }))
  let created = 0
  await page.route('**/api/users', route => {
    expect(route.request().method()).toBe('POST')
    created += 1
    return route.fulfill({ json: { username: 'test.klijent', initialPassword: 'fixture-only-password' } })
  })
  await page.goto('/admin/users', { waitUntil: 'networkidle' })
  const createTrigger = page.locator('[data-admin-users]').getByRole('button', { name: /novi korisnik|new user|kreiraj korisnika|create user/i })
  await createTrigger.click()
  const create = page.getByRole('dialog')
  await create.locator('#users-auth-first-name-2').fill('Test')
  await create.locator('#users-auth-last-name-2').fill('Klijent')
  await create.locator('#users-create-gender').selectOption('FEMALE')
  await create.getByRole('button', { name: /^(sačuvaj|save)$/i }).click()
  const credentials = page.getByRole('dialog', { name: /pristupni podaci|credentials/i })
  await expect(credentials).toContainText('fixture-only-password')
  const credentialsAxe = await new AxeBuilder({ page }).include('[data-users-dialog]').withTags([...AXE_RULE_TAGS, 'wcag2aaa']).analyze()
  console.log(`USERS_CREDENTIALS ${JSON.stringify({ violations: credentialsAxe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), incomplete: credentialsAxe.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) })}`)
  expect(assertableViolations(credentialsAxe.violations)).toEqual([])
  expect(created).toBe(1)
  await credentials.getByRole('button', { name: /^(u redu|ok|got it)$/i }).click()
  await expect(credentials).toBeHidden()
  await expect(page.locator('body')).not.toContainText('fixture-only-password')
  await expect(createTrigger).toBeFocused()
  await createTrigger.click()
  await page.keyboard.press('Escape')
  await expect(createTrigger).toBeFocused()
})

test('users treats malformed debt data as an error and retries without reporting no debt', async ({ page }) => {
  const user = { id: 'fixture-user', username: 'test.klijent', email: null, firstName: 'Test', lastName: 'Klijent', phone: null, gender: 'FEMALE', avatar: null, isActive: true, isEmailVerified: false, createdAt: '2026-01-01T00:00:00Z', userRoles: [{ role: { name: 'CLIENT' } }], stylistProfile: null }
  await page.route('**/api/users/system-admins**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/stylists**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/password-reset-candidates**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/clients/admin**', route => route.fulfill({ json: { items: [user], total: 1, page: 0, pageSize: 20 } }))
  let attempts = 0
  await page.route('**/api/client-debts?**', route => {
    attempts += 1
    return route.fulfill({ json: attempts <= 2 ? { unexpected: true } : [] })
  })
  await page.goto('/admin/users', { waitUntil: 'networkidle' })
  await page.locator('[data-admin-users]').getByRole('button', { name: /uredi.*test.klijent|edit.*test.klijent/i }).first().click()
  const dialog = page.locator('[data-users-dialog][role="dialog"]')
  const alert = dialog.getByRole('alert')
  await expect(alert).toBeVisible()
  await alert.getByRole('button', { name: /pokušaj ponovo|retry/i }).click()
  await expect(alert).toBeHidden()
  expect(attempts).toBeGreaterThanOrEqual(3)
})

for (const viewport of ['desktop', 'mobile'] as const) {
  test(`users Classic populated view and edit remain usable: ${viewport}`, async ({ page }) => {
    await page.setViewportSize(viewport === 'desktop' ? { width: 1440, height: 900 } : { width: 320, height: 720 })
    await page.route('**/api/settings/public', async route => {
      const response = await route.fetch()
      const rows = await response.json() as Array<{ key: string; value: string }>
      await route.fulfill({ response, json: [...rows.filter(row => row.key !== 'theme_active_skin'), { key: 'theme_active_skin', value: 'classic' }] })
    })
    const user = { id: 'fixture-client', username: 'primjer.klijent', email: null, firstName: 'Primjer', lastName: 'Klijent', phone: null, gender: 'FEMALE', avatar: null, isActive: true, isEmailVerified: false, createdAt: '2026-01-01T00:00:00Z', userRoles: [{ role: { name: 'CLIENT' } }] }
    await page.route('**/api/users/system-admins**', route => route.fulfill({ json: [] }))
    await page.route('**/api/users/stylists**', route => route.fulfill({ json: [] }))
    await page.route('**/api/users/password-reset-candidates**', route => route.fulfill({ json: [] }))
    await page.route('**/api/users/clients/admin**', route => route.fulfill({ json: { items: [user], total: 1, page: 0, pageSize: 20 } }))
    await page.route('**/api/client-debts?**', route => route.fulfill({ json: [] }))
    await page.goto('/admin/users', { waitUntil: 'networkidle' })
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic')
    const root = page.locator('[data-admin-users]')
    const edit = root.getByRole('button', { name: /uredi korisnika primjer.klijent|edit user primjer.klijent/i }).first()
    await edit.click()
    const dialog = page.locator('[data-users-dialog][role="dialog"]')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('#users-auth-first-name')).toHaveValue('Primjer')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(edit).toBeFocused()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
  })
}

test('users requires a fresh stylist preview after a conflict', async ({ page }) => {
  const user = { id: 'fixture-user', username: 'test.stilist', email: null, firstName: 'Test', lastName: 'Stilist', phone: null, gender: 'FEMALE', avatar: null, isActive: true, isEmailVerified: false, createdAt: '2026-01-01T00:00:00Z', userRoles: [{ role: { name: 'CLIENT' } }, { role: { name: 'STYLIST' } }], stylistProfile: { id: 'stylist-one', status: 'ACTIVE' } }
  await page.route('**/api/users/system-admins**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/stylists**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/password-reset-candidates**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/clients/admin**', route => route.fulfill({ json: { items: [user], total: 1, page: 0, pageSize: 20 } }))
  let previews = 0
  await page.route('**/api/users/fixture-user/stylist-removal-preview', route => {
    previews += 1
    return route.fulfill({ json: { stylistProfileId: 'stylist-one', financial: { clientDebtsCount: 0, manualIncomeCount: 0, bookedDailyLogsCount: 0 }, revision: (previews === 1 ? 'a' : 'b').repeat(64), counts: { dailyLogEntriesCount: 0, confirmedReservationsCount: 0, reservationResponsesCount: 0, reviewsCount: 0 } } })
  })
  let attempts = 0
  await page.route('**/api/users/fixture-user/remove-stylist-role', route => {
    attempts += 1
    expect(route.request().postDataJSON().previewRevision).toBe((attempts === 1 ? 'a' : 'b').repeat(64))
    return route.fulfill(attempts === 1 ? { status: 409, json: { code: 'USERS_STYLIST_PREVIEW_CHANGED', message: 'Conflict' } } : { json: { ok: true } })
  })
  await page.goto('/admin/users', { waitUntil: 'networkidle' })
  const remove = page.locator('[data-admin-users]').getByRole('button', { name: /ukloni ulogu.*stilist|remove.*stylist/i }).first()
  await remove.click()
  const dialog = page.getByRole('dialog', { name: /ukloni ulogu stiliste|remove stylist role/i })
  await dialog.getByRole('button', { name: /ukloni ulogu stiliste|remove stylist role/i }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText(/podaci stiliste su se promijenili|stylist.s records have changed/i)).toBeVisible()
  expect(attempts).toBe(1)
  await remove.click()
  await dialog.getByRole('button', { name: /ukloni ulogu stiliste|remove stylist role/i }).click()
  await expect.poll(() => attempts).toBe(2)
  expect(previews).toBe(2)
})

test('users does not report an empty list for a malformed successful client response', async ({ page }) => {
  await page.route('**/api/users/system-admins**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/stylists**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/password-reset-candidates**', route => route.fulfill({ json: [] }))
  let calls = 0
  await page.route('**/api/users/clients/admin**', route => {
    calls += 1
    return route.fulfill({ json: calls === 1 ? { total: 0 } : { items: [], total: 0, page: 0, pageSize: 20 } })
  })
  await page.goto('/admin/users', { waitUntil: 'networkidle' })
  const root = page.locator('[data-admin-users]')
  const alert = root.getByRole('alert')
  await expect(alert).toBeVisible()
  await alert.getByRole('button', { name: /pokušaj ponovo|retry/i }).click()
  await expect.poll(() => calls).toBe(2)
  await expect(alert).toBeHidden()
})

test('users requires explicit target and consent for financial history transfer', async ({ page }) => {
  const user = { id: 'fixture-user', username: 'test.stilist', email: null, firstName: 'Test', lastName: 'Stilist', phone: null, gender: 'FEMALE', avatar: null, isActive: true, isEmailVerified: false, createdAt: '2026-01-01T00:00:00Z', userRoles: [{ role: { name: 'CLIENT' } }, { role: { name: 'STYLIST' } }], stylistProfile: { id: 'stylist-one', status: 'ACTIVE' } }
  await page.route('**/api/users/system-admins**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/stylists**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/password-reset-candidates**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/clients/admin**', route => route.fulfill({ json: { items: [user], total: 1, page: 0, pageSize: 20 } }))
  await page.route('**/api/users/fixture-user/stylist-removal-preview', route => route.fulfill({ json: { stylistProfileId: 'stylist-one', revision: 'a'.repeat(64), financial: { clientDebtsCount: 2, manualIncomeCount: 1, bookedDailyLogsCount: 0 }, counts: { dailyLogEntriesCount: 0, confirmedReservationsCount: 0, reservationResponsesCount: 0, reviewsCount: 0 } } }))
  await page.route('**/api/stylists/admin**', route => route.fulfill({ json: [{ id: 'stylist-two', user: { isActive: true, username: 'drugi' }, status: 'ACTIVE', isActive: true }, { id: 'stylist-three', user: { isActive: true, username: 'treci' }, status: 'ACTIVE', isActive: true }] }))
  let mutations = 0
  await page.route('**/api/users/fixture-user/remove-stylist-role', route => {
    mutations += 1
    expect(route.request().postDataJSON()).toMatchObject({ financialTargetStylistProfileId: 'stylist-two', confirmFinancialTransfer: true })
    return route.fulfill({ json: {} })
  })
  await page.goto('/admin/users', { waitUntil: 'networkidle' })
  await page.locator('[data-admin-users]').getByRole('button', { name: /ukloni ulogu.*stilist|remove.*stylist/i }).first().click()
  const dialog = page.getByRole('dialog', { name: /ukloni ulogu stiliste|remove stylist role/i })
  await expect(dialog).toContainText(/2 dugovanja|2 debts/i)
  const confirm = dialog.getByRole('button', { name: /ukloni ulogu stiliste|remove stylist role/i })
  await expect(confirm).toBeDisabled()
  await dialog.locator('#users-financial-transfer-target').selectOption('stylist-two')
  await expect(confirm).toBeDisabled()
  await dialog.getByRole('checkbox').check()
  await expect(confirm).toBeEnabled()
  await dialog.locator('#users-financial-transfer-target').selectOption('stylist-three')
  await expect(dialog.getByRole('checkbox')).not.toBeChecked()
  await expect(confirm).toBeDisabled()
  await dialog.locator('#users-financial-transfer-target').selectOption('stylist-two')
  await dialog.getByRole('checkbox').check()
  await expect(confirm).toBeEnabled()
  expect(mutations).toBe(0)
  await confirm.click()
  await expect.poll(() => mutations).toBe(1)
})

test('saving unrelated user edits does not overwrite gender onboarding state', async ({ page }) => {
  const user = { id: 'fixture-user', username: 'test.klijent', email: null, firstName: 'Test', lastName: 'Klijent', phone: null, gender: 'FEMALE', avatar: null, isActive: true, isEmailVerified: false, createdAt: '2026-01-01T00:00:00Z', userRoles: [{ role: { name: 'CLIENT' } }] }
  await page.route('**/api/users/system-admins**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/stylists**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/password-reset-candidates**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/clients/admin**', route => route.fulfill({ json: { items: [user], total: 1, page: 0, pageSize: 20 } }))
  await page.route('**/api/client-debts?**', route => route.fulfill({ json: [] }))
  let saved = 0
  await page.route('**/api/users/fixture-user', route => {
    expect(route.request().method()).toBe('PATCH')
    expect(route.request().postDataJSON()).not.toHaveProperty('gender')
    saved += 1
    return route.fulfill({ json: user })
  })
  await page.goto('/admin/users', { waitUntil: 'networkidle' })
  await page.locator('[data-admin-users]').getByRole('button', { name: /uredi korisnika test.klijent|edit user test.klijent/i }).first().click()
  const edit = page.locator('[data-users-dialog][role="dialog"]')
  await edit.locator('#users-phone').fill('12345')
  await edit.getByRole('button', { name: /^(sačuvaj|save)$/i }).click()
  await expect.poll(() => saved).toBe(1)
  await expect(edit).toBeHidden()
})

test('users reflects a server-clamped page and hides client pagination on other tabs', async ({ page }) => {
  await page.route('**/api/users/system-admins**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/stylists**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/password-reset-candidates**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/clients/admin**', route => {
    const requestPage = Number(new URL(route.request().url()).searchParams.get('page'))
    return route.fulfill({ json: { items: [], total: requestPage === 0 ? 40 : 1, page: 0, pageSize: 20 } })
  })
  await page.goto('/admin/users', { waitUntil: 'networkidle' })
  const root = page.locator('[data-admin-users]')
  await root.getByRole('button', { name: /sljedeća|next/i }).click()
  await expect(root.getByRole('button', { name: '1', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(root.getByText('1 / 2', { exact: true })).toBeVisible()
  await root.getByRole('tab', { name: /administratori|admins/i }).click()
  await expect(root.getByRole('button', { name: /sljedeća|next/i })).toHaveCount(0)
})

test('users cannot dismiss a creation while the request is pending', async ({ page }) => {
  await page.route('**/api/users/system-admins**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/stylists**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/password-reset-candidates**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/clients/admin**', route => route.fulfill({ json: { items: [], total: 0, page: 0, pageSize: 20 } }))
  await page.route('**/api/users/username-availability?**', route => route.fulfill({ json: { available: true, suggestions: [] } }))
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  let requests = 0
  await page.route('**/api/users', async route => {
    requests += 1
    await gate
    await route.fulfill({ json: { username: 'test.klijent', initialPassword: 'fixture-only-password' } })
  })
  await page.goto('/admin/users', { waitUntil: 'networkidle' })
  await page.locator('[data-admin-users]').getByRole('button', { name: /novi korisnik|new user|kreiraj korisnika|create user/i }).click()
  const dialog = page.locator('[data-users-dialog][role="dialog"]')
  await dialog.locator('#users-auth-first-name-2').fill('Test')
  await dialog.locator('#users-auth-last-name-2').fill('Klijent')
  await dialog.locator('#users-create-gender').selectOption('FEMALE')
  await dialog.getByRole('button', { name: /^(sačuvaj|save)$/i }).click()
  await expect.poll(() => requests).toBe(1)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: /odustani|cancel/i })).toBeDisabled()
  release()
  await expect(page.getByRole('dialog', { name: /pristupni podaci|credentials/i })).toBeVisible()
  expect(requests).toBe(1)
})

for (const mode of ['light', 'dark'] as const) {
  for (const viewport of ['desktop', 'mobile'] as const) {
    test(`users financial transfer dialog accessibility ${mode} ${viewport}`, async ({ page }) => {
      await page.setViewportSize(viewport === 'desktop' ? { width: 1440, height: 900 } : { width: 320, height: 720 })
      await page.addInitScript(value => { localStorage.removeItem('nejra.theme'); localStorage.setItem('nejra.theme.mode', value) }, mode)
      await page.route('**/api/settings/public', async route => {
        const response = await route.fetch()
        const rows = await response.json() as Array<{ key: string; value: string }>
        await route.fulfill({ response, json: [...rows.filter(row => !['theme_active_skin', 'theme_default_mode'].includes(row.key)), { key: 'theme_active_skin', value: 'aurum' }, { key: 'theme_default_mode', value: mode }] })
      })
      const user = { id: 'fixture-user', username: 'test.stilist', email: null, firstName: 'Test', lastName: 'Stilist', phone: null, gender: 'FEMALE', avatar: null, isActive: true, isEmailVerified: false, createdAt: '2026-01-01T00:00:00Z', userRoles: [{ role: { name: 'CLIENT' } }, { role: { name: 'STYLIST' } }] }
      await page.route('**/api/users/system-admins**', route => route.fulfill({ json: [] }))
      await page.route('**/api/users/stylists**', route => route.fulfill({ json: [] }))
      await page.route('**/api/users/password-reset-candidates**', route => route.fulfill({ json: [] }))
      await page.route('**/api/users/clients/admin**', route => route.fulfill({ json: { items: [user], total: 1, page: 0, pageSize: 20 } }))
      await page.route('**/api/users/fixture-user/stylist-removal-preview', route => route.fulfill({ json: { stylistProfileId: 'stylist-one', revision: 'a'.repeat(64), financial: { clientDebtsCount: 2, manualIncomeCount: 1, bookedDailyLogsCount: 0 }, counts: { dailyLogEntriesCount: 0, confirmedReservationsCount: 0, reservationResponsesCount: 0, reviewsCount: 0 } } }))
      await page.route('**/api/stylists/admin**', route => route.fulfill({ json: [{ id: 'stylist-two', user: { isActive: true, username: 'drugi' }, status: 'ACTIVE', isActive: true }] }))
      await page.goto('/admin/users', { waitUntil: 'networkidle' })
      await page.locator('[data-admin-users]').getByRole('button', { name: /ukloni ulogu.*stilist|remove.*stylist/i }).first().click()
      const dialog = page.getByRole('dialog', { name: /ukloni ulogu stiliste|remove stylist role/i })
      await expect(dialog.locator('#users-financial-transfer-target').locator('option[value="stylist-two"]')).toHaveCount(1)
      const axe = await new AxeBuilder({ page }).include('[data-users-dialog]').withTags([...AXE_RULE_TAGS, 'wcag2aaa']).analyze()
      console.log(`USERS_FINANCIAL_${mode}_${viewport} ${JSON.stringify({ violations: axe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: axe.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) })}`)
      expect(axe.violations).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    })
  }
}

for (const mode of ['classic'] as const) {
  for (const viewport of ['desktop', 'mobile'] as const) {
    test(`users financial transfer dialog accessibility ${mode} ${viewport}`, async ({ page }) => {
      await page.setViewportSize(viewport === 'desktop' ? { width: 1440, height: 900 } : { width: 320, height: 720 })
      await page.addInitScript(() => { localStorage.removeItem('nejra.theme'); localStorage.removeItem('nejra.theme.mode') })
      await page.route('**/api/settings/public', async route => {
        const response = await route.fetch()
        const rows = await response.json() as Array<{ key: string; value: string }>
        await route.fulfill({ response, json: [...rows.filter(row => !['theme_active_skin', 'theme_default_mode'].includes(row.key)), { key: 'theme_active_skin', value: 'classic' }, { key: 'theme_default_mode', value: 'light' }] })
      })
      const user = { id: 'fixture-user', username: 'test.stilist', email: null, firstName: 'Test', lastName: 'Stilist', phone: null, gender: 'FEMALE', avatar: null, isActive: true, isEmailVerified: false, createdAt: '2026-01-01T00:00:00Z', userRoles: [{ role: { name: 'CLIENT' } }, { role: { name: 'STYLIST' } }] }
      await page.route('**/api/users/system-admins**', route => route.fulfill({ json: [] }))
      await page.route('**/api/users/stylists**', route => route.fulfill({ json: [] }))
      await page.route('**/api/users/password-reset-candidates**', route => route.fulfill({ json: [] }))
      await page.route('**/api/users/clients/admin**', route => route.fulfill({ json: { items: [user], total: 1, page: 0, pageSize: 20 } }))
      await page.route('**/api/users/fixture-user/stylist-removal-preview', route => route.fulfill({ json: { stylistProfileId: 'stylist-one', revision: 'a'.repeat(64), financial: { clientDebtsCount: 2, manualIncomeCount: 1, bookedDailyLogsCount: 0 }, counts: { dailyLogEntriesCount: 0, confirmedReservationsCount: 0, reservationResponsesCount: 0, reviewsCount: 0 } } }))
      await page.route('**/api/stylists/admin**', route => route.fulfill({ json: [{ id: 'stylist-two', user: { isActive: true, username: 'drugi' }, status: 'ACTIVE', isActive: true }] }))
      await page.goto('/admin/users', { waitUntil: 'networkidle' })
      await page.locator('[data-admin-users]').getByRole('button', { name: /ukloni ulogu.*stilist|remove.*stylist/i }).first().click()
      const dialog = page.getByRole('dialog', { name: /ukloni ulogu stiliste|remove stylist role/i })
      await expect(dialog.locator('#users-financial-transfer-target').locator('option[value="stylist-two"]')).toHaveCount(1)
      await expect(page.locator('html')).toHaveAttribute('data-skin', 'classic')
      const select = dialog.locator('#users-financial-transfer-target')
      await select.focus()
      await select.selectOption('stylist-two')
      await page.keyboard.press('Tab')
      const checkbox = dialog.getByRole('checkbox')
      await expect(checkbox).toBeFocused()
      await page.keyboard.press('Space')
      await expect(checkbox).toBeChecked()
      const axe = await new AxeBuilder({ page }).include('[data-users-dialog]').withTags([...AXE_RULE_TAGS, 'wcag2aaa']).analyze()
      console.log(`USERS_FINANCIAL_${mode}_${viewport} ${JSON.stringify({ violations: axe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: axe.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) })}`)
      expect(axe.violations).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    })
  }
}

test('users waits for transfer targets and never offers pending or unknown targets as active', async ({ page }) => {
  const user = { id: 'fixture-user', username: 'test.stilist', email: null, firstName: 'Test', lastName: 'Stilist', phone: null, gender: 'FEMALE', avatar: null, isActive: true, isEmailVerified: false, createdAt: '2026-01-01T00:00:00Z', userRoles: [{ role: { name: 'CLIENT' } }, { role: { name: 'STYLIST' } }] }
  await page.route('**/api/users/system-admins**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/stylists**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/password-reset-candidates**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/clients/admin**', route => route.fulfill({ json: { items: [user], total: 1, page: 0, pageSize: 20 } }))
  await page.route('**/api/users/fixture-user/stylist-removal-preview', route => route.fulfill({ json: { stylistProfileId: 'stylist-one', revision: 'a'.repeat(64), financial: { clientDebtsCount: 1, manualIncomeCount: 0, bookedDailyLogsCount: 0 }, counts: { dailyLogEntriesCount: 0, confirmedReservationsCount: 0, reservationResponsesCount: 0, reviewsCount: 0 } } }))
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  let requested = false
  await page.route('**/api/stylists/admin**', async route => {
    requested = true
    await gate
    await route.fulfill({ json: [{ id: 'pending', status: 'PENDING', isActive: true, user: { username: 'pending', isActive: true } }, { id: 'inactive', status: 'ACTIVE', isActive: false, user: { username: 'inactive', isActive: true } }, { id: 'disabled-user', status: 'ACTIVE', isActive: true, user: { username: 'disabled-user', isActive: false } }, { id: 'unknown', status: null, isActive: true, user: { username: 'unknown', isActive: true } }] })
  })
  await page.goto('/admin/users', { waitUntil: 'networkidle' })
  await page.locator('[data-admin-users]').getByRole('button', { name: /ukloni ulogu.*stilist|remove.*stylist/i }).first().click()
  const dialog = page.getByRole('dialog', { name: /ukloni ulogu stiliste|remove stylist role/i })
  await expect.poll(() => requested).toBe(true)
  await expect(dialog.getByRole('status')).toBeVisible()
  await expect(dialog.locator('#users-financial-transfer-target')).toHaveCount(0)
  await expect(dialog.getByRole('button', { name: /ukloni ulogu stiliste|remove stylist role/i })).toBeDisabled()
  release()
  const select = dialog.locator('#users-financial-transfer-target')
  await expect(select.locator('option[value="pending"]')).toBeDisabled()
  await expect(select.locator('option[value="inactive"]')).toBeDisabled()
  await expect(select.locator('option[value="disabled-user"]')).toBeDisabled()
  await expect(select.locator('option[value="unknown"]')).toHaveCount(0)
  await expect(dialog.getByText(/nema drugog aktivnog stiliste|no other active stylist/i)).toBeVisible()
  await dialog.getByRole('checkbox').check()
  await expect(dialog.getByRole('button', { name: /ukloni ulogu stiliste|remove stylist role/i })).toBeDisabled()
})

test('users cannot delete booked daily logs and must choose a transfer target', async ({ page }) => {
  const user = { id: 'fixture-user', username: 'test.stilist', email: null, firstName: 'Test', lastName: 'Stilist', phone: null, gender: 'FEMALE', avatar: null, isActive: true, isEmailVerified: false, createdAt: '2026-01-01T00:00:00Z', userRoles: [{ role: { name: 'CLIENT' } }, { role: { name: 'STYLIST' } }] }
  await page.route('**/api/users/system-admins**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/stylists**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/password-reset-candidates**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/clients/admin**', route => route.fulfill({ json: { items: [user], total: 1, page: 0, pageSize: 20 } }))
  await page.route('**/api/users/fixture-user/stylist-removal-preview', route => route.fulfill({ json: { stylistProfileId: 'stylist-one', revision: 'a'.repeat(64), financial: { clientDebtsCount: 0, manualIncomeCount: 0, bookedDailyLogsCount: 1 }, counts: { dailyLogEntriesCount: 1, confirmedReservationsCount: 0, reservationResponsesCount: 0, reviewsCount: 0 } } }))
  await page.route('**/api/stylists/admin**', route => route.fulfill({ json: [{ id: 'stylist-two', status: 'ACTIVE', isActive: true, user: { username: 'drugi', isActive: true } }] }))
  let mutations = 0
  await page.route('**/api/users/fixture-user/remove-stylist-role', route => {
    mutations += 1
    expect(route.request().postDataJSON().dailyLogs).toEqual({ mode: 'TRANSFER', targetStylistProfileId: 'stylist-two' })
    return route.fulfill({ json: {} })
  })
  await page.goto('/admin/users', { waitUntil: 'networkidle' })
  await page.locator('[data-admin-users]').getByRole('button', { name: /ukloni ulogu.*stilist|remove.*stylist/i }).first().click()
  const dialog = page.getByRole('dialog', { name: /ukloni ulogu stiliste|remove stylist role/i })
  await expect(dialog).toContainText(/mijenja historijsku atribuciju|changes historical income attribution/i)
  const confirm = dialog.getByRole('button', { name: /ukloni ulogu stiliste|remove stylist role/i })
  await expect(confirm).toBeDisabled()
  await dialog.locator('input[name="dailyLogs-mode"][value="DELETE"]').check()
  await expect(confirm).toBeDisabled()
  await dialog.locator('input[name="dailyLogs-mode"][value="TRANSFER"]').check()
  await expect(confirm).toBeDisabled()
  await dialog.locator('#users-stylist-removal-target-dailyLogs').selectOption('stylist-two')
  await expect(confirm).toBeEnabled()
  expect(mutations).toBe(0)
  await confirm.click()
  await expect.poll(() => mutations).toBe(1)
})

const clientAnalyticsFixture = {
  fromDate: null, toDate: null,
  user: { id: 'fixture-client', username: 'primjer.klijent', email: null, firstName: 'Primjer', lastName: 'Klijent', phone: null, isActive: true, createdAt: '2026-01-01T00:00:00Z', userRoles: [{ role: { name: 'CLIENT' } }] },
  stats: { totalReservations: 1, completedReservations: 1, cancelledReservations: 0, noShowCount: 0, totalSpent: 42, manualEntryCount: 0, manualSpent: 0, avgServiceRating: null, reviewCount: 0 },
  penalty: { cancellationCount: 0, penaltyUntil: null, isPenalized: false }, topServices: [], reservations: [], reviews: [], manualEntries: [],
}

test('users eye opens the selected client analytics and preserves the tab through date filters', async ({ page }) => {
  const user = { ...clientAnalyticsFixture.user, gender: 'FEMALE', avatar: null, isEmailVerified: false }
  await page.route('**/api/users/system-admins**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/stylists**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/password-reset-candidates**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/clients/admin**', route => route.fulfill({ json: { items: [user], total: 1, page: 0, pageSize: 20 } }))
  let calls = 0
  await page.route('**/api/users/fixture-client/analytics**', route => { calls++; return route.fulfill({ json: clientAnalyticsFixture }) })
  await page.route('**/api/client-debts?**', route => route.fulfill({ json: [] }))
  await page.goto('/admin/users', { waitUntil: 'networkidle' })
  await page.locator('[data-admin-users]').getByRole('button', { name: /analitika klijenta primjer.klijent|client analytics primjer.klijent/i }).first().click()
  await expect(page).toHaveURL(/\/admin\/analytics\?tab=clients&userId=fixture-client/)
  await expect(page.getByRole('heading', { name: /analitika klijenta|client analytics/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Primjer Klijent' })).toBeVisible()
  await expect.poll(() => calls).toBe(1)
  await page.locator('#client-from').fill('2026-01-01')
  await page.locator('#client-to').fill('2026-02-01')
  await page.getByRole('button', { name: /primijeni period|apply period/i }).click()
  await expect(page).toHaveURL(/tab=clients.*userId=fixture-client.*fromDate=2026-01-01.*toDate=2026-02-01/)
  await expect.poll(() => calls).toBe(2)
  await expect(page.getByRole('heading', { name: 'Primjer Klijent' })).toBeVisible()
  await page.getByRole('button', { name: /cijeli period|full period/i }).click()
  await expect(page).toHaveURL(/tab=clients.*userId=fixture-client/)
  await expect(page).not.toHaveURL(/fromDate=/)
  await expect.poll(() => calls).toBe(3)
  await page.getByRole('button', { name: /nazad na korisnike|back to users/i }).click()
  await expect(page).toHaveURL(/\/admin\/users$/)
})

test('client analytics shows recoverable failures without hiding debt errors or looping', async ({ page }) => {
  let analyticsCalls = 0
  let debtCalls = 0
  await page.route('**/api/users/fixture-client/analytics**', route => {
    analyticsCalls++
    return route.fulfill(analyticsCalls === 1 ? { status: 500, json: {} } : { json: clientAnalyticsFixture })
  })
  await page.route('**/api/client-debts?**', route => {
    debtCalls++
    return route.fulfill(debtCalls <= 2 ? { status: 500, json: {} } : { json: [] })
  })
  await page.goto('/admin/analytics?tab=clients&userId=fixture-client', { waitUntil: 'networkidle' })
  const alert = page.getByRole('alert')
  await expect(alert).toContainText(/greška pri učitavanju analitike|error loading analytics/i)
  expect(analyticsCalls).toBe(1)
  await alert.getByRole('button', { name: /pokušaj ponovo|retry/i }).click()
  await expect(page.getByRole('heading', { name: 'Primjer Klijent' })).toBeVisible()
  await page.getByRole('tab', { name: /dugovanja|debts/i }).click()
  await expect(alert).toContainText(/dugovanja nije moguće učitati|could not load debts/i)
  await alert.getByRole('button', { name: /pokušaj ponovo|retry/i }).click()
  await expect(page.getByRole('heading', { name: 'Primjer Klijent' })).toBeVisible()
  await expect(page.getByRole('tab', { name: /dugovanja|debts/i })).toBeVisible()
  expect(analyticsCalls).toBe(3)
  expect(debtCalls).toBe(3)
})

test('client analytics rejects an invalid or wrong-user response and retries without a request loop', async ({ page }) => {
  let requests = 0
  await page.route('**/api/users/fixture-client/analytics**', route => {
    requests++
    return route.fulfill({ json: requests === 1 ? { ...clientAnalyticsFixture, user: { ...clientAnalyticsFixture.user, id: 'other-client' } } : clientAnalyticsFixture })
  })
  await page.route('**/api/client-debts?**', route => route.fulfill({ json: [] }))
  await page.goto('/admin/analytics?tab=clients&userId=fixture-client', { waitUntil: 'networkidle' })
  const alert = page.getByRole('alert')
  await expect(alert).toContainText(/greška pri učitavanju analitike|error loading analytics/i)
  expect(requests).toBe(1)
  await alert.getByRole('button', { name: /pokušaj ponovo|retry/i }).click()
  await expect(page.getByRole('heading', { name: 'Primjer Klijent' })).toBeVisible()
  expect(requests).toBe(2)
})

test('users mobile client analytics action opens the selected detail', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 })
  const user = { ...clientAnalyticsFixture.user, gender: 'FEMALE', avatar: null, isEmailVerified: false }
  await page.route('**/api/users/system-admins**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/stylists**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/password-reset-candidates**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/clients/admin**', route => route.fulfill({ json: { items: [user], total: 1, page: 0, pageSize: 20 } }))
  await page.route('**/api/users/fixture-client/analytics**', route => route.fulfill({ json: clientAnalyticsFixture }))
  await page.route('**/api/client-debts?**', route => route.fulfill({ json: [] }))
  await page.goto('/admin/users', { waitUntil: 'networkidle' })
  await page.locator('[data-admin-users]').getByRole('button', { name: /analitika|analytics/i }).first().click()
  await expect(page).toHaveURL(/tab=clients&userId=fixture-client/)
  await expect(page.getByRole('heading', { name: 'Primjer Klijent' })).toBeVisible()
  await expect(page.locator('html')).toHaveJSProperty('scrollWidth', 320)
})

for (const viewport of ['desktop', 'mobile'] as const) {
  test(`users deactivation requires confirmation and remains available on ${viewport}`, async ({ page }) => {
    await page.setViewportSize(viewport === 'desktop' ? { width: 1440, height: 900 } : { width: 320, height: 720 })
    const user = { ...clientAnalyticsFixture.user, gender: 'FEMALE', avatar: null, isEmailVerified: false }
    await page.route('**/api/users/system-admins**', route => route.fulfill({ json: [] }))
    await page.route('**/api/users/stylists**', route => route.fulfill({ json: [] }))
    await page.route('**/api/users/password-reset-candidates**', route => route.fulfill({ json: [] }))
    await page.route('**/api/users/clients/admin**', route => route.fulfill({ json: { items: [user], total: 1, page: 0, pageSize: 20 } }))
    let requests = 0
    await page.route('**/api/users/fixture-client', route => {
      requests++
      expect(route.request().method()).toBe('PATCH')
      expect(route.request().postDataJSON()).toEqual({ isActive: false })
      return route.fulfill({ json: { ...user, isActive: false } })
    })
    await page.goto('/admin/users', { waitUntil: 'networkidle' })
    const action = page.locator('[data-admin-users]').getByRole('button', { name: /deaktiviraj korisnika primjer.klijent|deactivate user primjer.klijent/i }).first()
    await action.click()
    const dialog = page.getByRole('dialog', { name: /potvrda|confirmation/i })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(/primjer\.klijent/)
    expect(requests).toBe(0)
    const results = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(AXE_RULE_TAGS).analyze()
    expect(assertableViolations(results.violations)).toEqual([])
    await dialog.getByRole('button', { name: /odustani|cancel/i }).click()
    await expect(dialog).toBeHidden()
    await expect(action).toBeFocused()
    expect(requests).toBe(0)
    await action.click()
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: /^potvrdi$|^confirm$/i }).click()
    await expect.poll(() => requests).toBe(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
  })
}

test('users role management preserves client role and confirms removal', async ({ page }) => {
  const user = { ...clientAnalyticsFixture.user, gender: 'FEMALE', avatar: null, isEmailVerified: false, userRoles: [{ role: { name: 'CLIENT' } }, { role: { name: 'SYSTEM_ADMIN' } }] }
  await page.route('**/api/users/system-admins**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/stylists**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/password-reset-candidates**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/clients/admin**', route => route.fulfill({ json: { items: [user], total: 1, page: 0, pageSize: 20 } }))
  let additions = 0
  let removals = 0
  await page.route('**/api/users/fixture-client/roles**', route => {
    if (route.request().method() === 'POST') {
      additions++
      expect(route.request().postDataJSON()).toEqual({ role: 'STYLIST' })
    } else if (route.request().method() === 'DELETE') removals++
    return route.fulfill({ json: {} })
  })
  await page.goto('/admin/users', { waitUntil: 'networkidle' })
  const root = page.locator('[data-admin-users]')
  await expect(root.getByRole('button', { name: /ukloni ulogu klijent korisniku|remove client role/i })).toHaveCount(0)
  await root.getByRole('button', { name: /dodaj ulogu korisniku primjer.klijent|add role.*primjer.klijent/i }).first().click()
  await page.getByRole('menuitem', { name: /^stilist$|^stylist$/i }).click()
  await expect.poll(() => additions).toBe(1)
  const remove = root.getByRole('button', { name: /ukloni ulogu sistemski administrator korisniku primjer.klijent|remove.*administrator.*primjer.klijent/i }).first()
  await expect(remove).toBeVisible()
  await remove.click()
  const dialog = page.getByRole('dialog', { name: /potvrda|confirmation/i })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText(/sistemski administrator|system administrator/i)
  expect(removals).toBe(0)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  expect(removals).toBe(0)
  await remove.click()
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: /^potvrdi$|^confirm$/i }).click()
  await expect.poll(() => removals).toBe(1)
})

test('users reset link requires verified email and explicit confirmation', async ({ page }) => {
  const verified = { ...clientAnalyticsFixture.user, gender: 'FEMALE', avatar: null, email: 'fixture@example.test', isEmailVerified: true }
  const unverified = { ...verified, id: 'fixture-unverified', username: 'nepotvrdjen', isEmailVerified: false }
  await page.route('**/api/users/system-admins**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/stylists**', route => route.fulfill({ json: [] }))
  await page.route('**/api/users/password-reset-candidates**', route => route.fulfill({ json: [{ id: verified.id }, { id: unverified.id }] }))
  await page.route('**/api/users/clients/admin**', route => route.fulfill({ json: { items: [verified, unverified], total: 2, page: 0, pageSize: 20 } }))
  let requests = 0
  await page.route('**/auth/admin/users/fixture-client/password-reset-link', route => { requests++; return route.fulfill({ json: {} }) })
  await page.goto('/admin/users', { waitUntil: 'networkidle' })
  const root = page.locator('[data-admin-users]')
  await expect(root.getByRole('button', { name: /pošalji link za reset lozinke korisniku nepotvrdjen|reset.*nepotvrdjen/i }).first()).toBeDisabled()
  const send = root.getByRole('button', { name: /pošalji link za reset lozinke korisniku primjer.klijent|reset.*primjer.klijent/i }).first()
  await send.click()
  const dialog = page.getByRole('dialog', { name: /potvrda|confirmation/i })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText(/fixture@example\.test/)
  expect(requests).toBe(0)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(send).toBeFocused()
  expect(requests).toBe(0)
  await send.click()
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: /^potvrdi$|^confirm$/i }).click()
  await expect.poll(() => requests).toBe(1)
})

const analyticsDashboardFixture = {
  fromDate: '2026-01-01', toDate: '2026-01-31', monthlyFinance: [{ year: 2026, month: 1, label: '2026-01', income: 100, expenses: 30, tips: 5 }],
  stylistPerformance: [{ stylistProfileId: 'stylist-one', stylistName: 'Test Stilista', completedCount: 2, revenue: 100, tips: 5 }],
  topServices: [{ serviceId: 'service-one', serviceName: 'Test Usluga', count: 2, revenue: 100 }], conversionRate: 50, totalPending: 2, totalCompleted: 2,
  periodFinance: { servicesRevenue: 95, tips: 5, totalIncome: 100, expensesByCategory: [{ categoryId: 'category-one', categoryName: 'Test Trošak', total: 30 }], totalExpenses: 30, netProfit: 70 },
}

test('analytics custom range applies only on confirmation and rejects reversed dates', async ({ page }) => {
  const queries: string[] = []
  await page.route('**/api/analytics/dashboard**', route => { queries.push(new URL(route.request().url()).search); return route.fulfill({ json: analyticsDashboardFixture }) })
  await page.goto('/admin/analytics', { waitUntil: 'networkidle' })
  await expect(page.getByText('Test Trošak')).toBeVisible()
  await expect(page.getByRole('table', { name: /performanse stilista|stylist performance/i })).toBeVisible()
  await page.locator('#analytics-period').selectOption('custom')
  await page.locator('#analytics-from').fill('2026-03-01')
  await page.locator('#analytics-to').fill('2026-02-01')
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('button', { name: /primijeni|apply/i })).toBeDisabled()
  expect(queries).toHaveLength(1)
  await page.locator('#analytics-to').fill('2026-03-31')
  expect(queries).toHaveLength(1)
  await page.getByRole('button', { name: /primijeni|apply/i }).click()
  await expect.poll(() => queries.length).toBe(2)
  const applied = new URLSearchParams(queries[1])
  expect(applied.get('fromDate')).toBe('2026-03-01')
  expect(applied.get('toDate')).toBe('2026-03-31')
  await expect(page.getByText('Test Trošak')).toBeVisible()
  await page.getByText(/prikaži podatke grafa u tabeli|show data table/i).click()
  await expect(page.getByRole('table', { name: /mjesečn|monthly/i })).toBeVisible()
  await expect(page.getByRole('table', { name: /mjesečn|monthly/i })).toContainText(/75[,.]00/)
})

test('analytics ignores older responses and retries failed requests without hiding filters', async ({ page }) => {
  let count = 0
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/analytics/dashboard**', async route => {
    count++
    const sequence = count
    if (sequence === 2) await gate
    if (sequence === 4) return route.fulfill({ status: 500, json: {} })
    return route.fulfill({ json: { ...analyticsDashboardFixture, periodFinance: { ...analyticsDashboardFixture.periodFinance, expensesByCategory: [{ categoryId: 'one', categoryName: sequence === 2 ? 'Zastarjelo' : 'Aktuelno', total: 30 }] } } })
  })
  await page.goto('/admin/analytics', { waitUntil: 'networkidle' })
  const period = page.locator('#analytics-period')
  await expect(page.getByText('Aktuelno')).toBeVisible()
  await period.selectOption('thisMonth')
  await expect.poll(() => count).toBe(2)
  await expect(page.getByRole('status').filter({ hasText: /učitavanje|loading/i })).toBeVisible()
  await period.selectOption('lastMonth')
  await expect.poll(() => count).toBe(3)
  await expect(page.getByText('Aktuelno')).toBeVisible()
  release()
  await expect(page.getByText('Zastarjelo')).toHaveCount(0)
  await period.selectOption('12')
  const alert = page.getByRole('alert')
  await expect(alert).toBeVisible()
  await expect(period).toBeVisible()
  await alert.getByRole('button', { name: /pokušaj ponovo|retry/i }).click()
  await expect.poll(() => count).toBe(5)
  await expect(page.getByText('Aktuelno')).toBeVisible()
})

test('stylist analytics honours deep-link period, explicit apply, response identity and retry', async ({ page }) => {
  const queries: string[] = []
  const fixture = { stylist: { id: 'profile-1', name: 'Ana Test' }, fromDate: '2026-01-01', toDate: '2026-01-31', completedCount: 1, revenue: 50, tips: 5, topServices: [{ serviceId: 's1', serviceName: 'Šišanje Test', count: 1, revenue: 50 }], recentEntries: [] }
  await page.route('**/api/stylists/profile-1/analytics**', route => {
    queries.push(new URL(route.request().url()).search)
    if (queries.length === 2) return route.fulfill({ json: { ...fixture, stylist: { id: 'wrong-profile', name: 'Pogrešan stilista' } } })
    return route.fulfill({ json: fixture })
  })
  await page.goto('/admin/analytics?tab=stylists&stylistId=profile-1&fromDate=2026-01-01&toDate=2026-01-31', { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: 'Ana Test' })).toBeVisible()
  expect(new URLSearchParams(queries[0]).get('fromDate')).toBe('2026-01-01')
  await page.locator('#stylist-from').fill('2026-03-01')
  await expect(page.getByRole('button', { name: /primijeni period|apply period/i })).toBeDisabled()
  await page.locator('#stylist-to').fill('2026-03-31')
  expect(queries).toHaveLength(1)
  await page.getByRole('button', { name: /primijeni period|apply period/i }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByText('Pogrešan stilista')).toHaveCount(0)
  await page.getByRole('alert').getByRole('button', { name: /pokušaj ponovo|retry/i }).click()
  await expect(page.getByRole('heading', { name: 'Ana Test' })).toBeVisible()
  expect(new URLSearchParams(queries[2]).get('fromDate')).toBe('2026-03-01')
})

test('expense date preserves estimated provenance until explicitly confirmed', async ({ page }) => {
  const field = { id: 'field-1', fieldName: 'Iznos test', fieldType: 'NUMBER', isRequired: true, sortOrder: 0, defaultValue: null }
  const category = { id: 'category-1', name: 'Test kategorija', isActive: true, isFixed: true, templateId: 'template-1', template: { id: 'template-1', name: 'Test', fields: [field], requiresAttachmentPerItem: false } }
  const expense = { id: 'expense-1', title: 'Test rashod', expenseDate: '2026-03-01T00:00:00.000Z', dateEstimated: true, totalAmount: 30, notes: null, createdAt: '2026-03-02T00:00:00.000Z', category, fieldValues: [{ id: 'value-1', fieldId: 'field-1', value: '30' }], attachments: [] }
  const book = { id: 'book-1', year: 2026, month: 3, isClosed: false, openedAt: '2026-03-01T00:00:00Z', closedAt: null, expenses: [expense], totalExpenses: 30, lockEvents: [] }
  const bodies: Array<Record<string, unknown>> = []
  await page.route('**/api/expense-books', route => route.fulfill({ json: [book] }))
  await page.route('**/api/expense-books/book-1', route => route.fulfill({ json: book }))
  await page.route('**/api/expense-categories', route => route.fulfill({ json: [category] }))
  await page.route('**/api/expenses/expense-1', route => {
    bodies.push(route.request().postDataJSON())
    return route.fulfill({ json: expense })
  })
  await page.goto('/admin/finance?tab=expense', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /otvori knjigu.*2026|open book.*2026/i }).click()
  await expect(page.getByText(/procijenjeno|estimated/i)).toBeVisible()
  await page.getByRole('button', { name: /uredi rashod test rashod|edit expense test rashod/i }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel(/datum rashoda|expense date/i)).toHaveValue('2026-03-01')
  await dialog.getByLabel(/datum rashoda|expense date/i).fill('2026-04-01')
  await expect(dialog.getByRole('button', { name: /sačuvaj|save/i })).toBeDisabled()
  await dialog.getByLabel(/datum rashoda|expense date/i).fill('2026-03-01')
  await dialog.getByRole('button', { name: /sačuvaj|save/i }).click()
  await expect.poll(() => bodies.length).toBe(1)
  expect(bodies[0]).not.toHaveProperty('expenseDate')
  await expect(dialog).toBeHidden()
  await page.getByRole('button', { name: /uredi rashod test rashod|edit expense test rashod/i }).click()
  await dialog.getByRole('checkbox', { name: /potvrđujem da je prikazani datum tačan|i confirm the displayed date/i }).check()
  await dialog.getByRole('button', { name: /sačuvaj|save/i }).click()
  await expect.poll(() => bodies.length).toBe(2)
  expect(bodies[1].expenseDate).toBe('2026-03-01')
})

for (const mode of ['light', 'dark'] as const) {
  for (const viewport of ['desktop', 'mobile'] as const) {
    for (const panel of ['overview', 'clients', 'stylists'] as const) {
      test(`analytics populated accessibility ${panel} ${mode} ${viewport}`, async ({ page }) => {
        await page.setViewportSize(viewport === 'desktop' ? { width: 1440, height: 900 } : { width: 320, height: 720 })
        await page.addInitScript(value => { localStorage.removeItem('nejra.theme'); localStorage.setItem('nejra.theme.mode', value) }, mode)
        await page.route('**/api/settings/public', async route => {
          const response = await route.fetch()
          const rows = await response.json() as Array<{ key: string; value: string }>
          await route.fulfill({ response, json: [...rows.filter(row => !['theme_active_skin', 'theme_default_mode'].includes(row.key)), { key: 'theme_active_skin', value: 'aurum' }, { key: 'theme_default_mode', value: mode }] })
        })
        await page.route('**/api/analytics/dashboard**', route => route.fulfill({ json: analyticsDashboardFixture }))
        await page.route('**/api/users/fixture-client/analytics**', route => route.fulfill({ json: { ...clientAnalyticsFixture, topServices: [{ name: 'Usluga test', count: 2, totalSpent: 42 }] } }))
        await page.route('**/api/client-debts?**', route => route.fulfill({ json: [] }))
        await page.route('**/api/stylists/stylist-one/analytics**', route => route.fulfill({ json: { stylist: { id: 'stylist-one', name: 'Test Stilista', user: { email: 'stylist@example.test' } }, fromDate: '2026-01-01', toDate: '2026-01-31', completedCount: 2, revenue: 100, tips: 5, topServices: [{ serviceId: 'service-one', serviceName: 'Usluga test', count: 2, revenue: 100 }], recentEntries: [{ id: 'entry-1', date: '2026-01-15', serviceName: 'Usluga test', clientName: 'Klijent Test', actualPrice: 55, tipAmount: 5 }] } }))
        const path = panel === 'overview' ? '/admin/analytics' : panel === 'clients' ? '/admin/analytics?tab=clients&userId=fixture-client' : '/admin/analytics?tab=stylists&stylistId=stylist-one'
        await page.goto(path, { waitUntil: 'networkidle' })
        await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
        await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
        await expect(page.locator('[data-analytics-hub]')).toContainText(panel === 'overview' ? 'Test Trošak' : panel === 'clients' ? 'Primjer Klijent' : 'Test Stilista')
        if (panel === 'overview') {
          // The legend renders three tiny 14×14 <svg> icons; the chart itself is
          // the single <svg role="application">. Scope the assertion to it so
          // strict-mode doesn't resolve the selector to 4 elements.
          const chartSurface = page.locator('[data-analytics-hub] .recharts-responsive-container svg.recharts-surface[role="application"]')
          await expect(chartSurface).toBeVisible()
          await expect.poll(async () => (await chartSurface.boundingBox())?.width ?? 0).toBeGreaterThan(100)
          await expect.poll(async () => (await chartSurface.boundingBox())?.height ?? 0).toBeGreaterThan(100)
          await expect.poll(async () => (await chartSurface.locator('.recharts-bar-rectangle path').first().boundingBox())?.height ?? 0).toBeGreaterThan(0)
          const selectStyle = await page.locator('#analytics-period').evaluate(el => ({ background: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color, border: getComputedStyle(el).borderColor }))
          const cardStyle = await page.locator('[data-analytics-hub] [data-default-card-surface]').first().evaluate(el => ({ background: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color, border: getComputedStyle(el).borderColor }))
          expect(selectStyle.background).toBe(cardStyle.background)
          expect(selectStyle.border).toBe(cardStyle.border)
          await page.getByText(/prikaži podatke grafa u tabeli|show data table/i).click()
        }
        await settleAnimations(page)
        if (panel === 'clients' && viewport === 'mobile') {
          const stat = page.locator('[data-analytics-hub] .grid.grid-cols-2 > [data-default-card-surface]').nth(4)
          await stat.scrollIntoViewIfNeeded()
          await page.evaluate(() => window.scrollBy(0, -100))
          await settleAnimations(page)
          const focusedScan = await new AxeBuilder({ page }).include('[data-analytics-hub] .grid.grid-cols-2 > [data-default-card-surface]:nth-child(5)').withTags([...AXE_RULE_TAGS, 'wcag2aaa']).analyze()
          console.log(`ANALYTICS_PENALTY_STAT_${mode} ${JSON.stringify({ violations: focusedScan.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), incomplete: focusedScan.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) })}`)
          expect(focusedScan.violations).toEqual([])
          console.log(`ANALYTICS_PENALTY_GEOMETRY_${mode} ${JSON.stringify(await stat.locator('p').nth(1).evaluate(el => {
            const r = el.getBoundingClientRect()
            return { rect: { x: r.x, y: r.y, width: r.width, height: r.height }, stack: document.elementsFromPoint(Math.min(innerWidth - 1, Math.max(0, r.x + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.y + r.height / 2))).slice(0, 6).map(node => ({ tag: node.tagName, className: node.getAttribute('class'), text: node.textContent?.slice(0, 40) })) }
          }))}`)
          expect(focusedScan.incomplete).toEqual([])

        }
        const results = await new AxeBuilder({ page }).include('[data-analytics-hub]').withTags([...AXE_RULE_TAGS, 'wcag2aaa']).analyze()
        console.log(`ANALYTICS_MATRIX_${panel}_${mode}_${viewport} ${JSON.stringify({ violations: results.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: results.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) })}`)
        const aa = results.violations.filter(v => v.id !== 'color-contrast-enhanced')
        expect(aa).toEqual([])
        const overflow = await page.evaluate(() => ({ excess: document.documentElement.scrollWidth - document.documentElement.clientWidth, elements: Array.from(document.querySelectorAll('[data-analytics-hub] *')).filter(el => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1).slice(0, 12).map(el => ({ tag: el.tagName, className: el.getAttribute('class'), right: el.getBoundingClientRect().right })) }))
        expect(overflow.excess, JSON.stringify(overflow.elements)).toBeLessThanOrEqual(1)
      })
    }
  }
}

test('legacy analytics links preserve identifiers, dates and replace conflicting tab', async ({ page }) => {
  const seen: string[] = []
  await page.route('**/api/users/fixture-client/analytics**', route => { seen.push(route.request().url()); return route.fulfill({ json: clientAnalyticsFixture }) })
  await page.route('**/api/client-debts?**', route => route.fulfill({ json: [] }))
  await page.route('**/api/stylists/stylist-one/analytics**', route => { seen.push(route.request().url()); return route.fulfill({ json: { stylist: { id: 'stylist-one', name: 'Test Stilista' }, fromDate: '2026-01-01', toDate: '2026-01-31', completedCount: 0, revenue: 0, tips: 0, topServices: [], recentEntries: [] } }) })
  for (const item of [
    { old: 'client-analytics', id: 'userId=fixture-client', tab: 'clients', name: 'Primjer Klijent' },
    { old: 'stylist-analytics', id: 'stylistId=stylist-one', tab: 'stylists', name: 'Test Stilista' },
  ]) {
    await page.goto(`/admin/${item.old}?${item.id}&fromDate=2026-01-01&toDate=2026-01-31&tab=overview`, { waitUntil: 'networkidle' })
    const url = new URL(page.url())
    expect(url.pathname).toBe('/admin/analytics')
    expect(url.searchParams.get('tab')).toBe(item.tab)
    expect(url.searchParams.get(item.id.split('=')[0])).toBe(item.id.split('=')[1])
    expect(url.searchParams.get('fromDate')).toBe('2026-01-01')
    expect(url.searchParams.get('toDate')).toBe('2026-01-31')
    await expect(page.getByRole('heading', { name: item.name })).toBeVisible()
    const requestUrl = new URL(seen[seen.length - 1])
    expect(requestUrl.searchParams.get('fromDate')).toBe('2026-01-01')
    expect(requestUrl.searchParams.get('toDate')).toBe('2026-01-31')
  }
})

test('analytics subviews are keyboard-navigable from the sidebar and chart table toggles', async ({ page }) => {
  await page.route('**/api/analytics/dashboard**', route => route.fulfill({ json: analyticsDashboardFixture }))
  await page.goto('/admin/analytics', { waitUntil: 'networkidle' })
  // Pod-pogledi analitike su grupisani u bočnoj traci (grupa „Analitika"), a ne kao
  // zaseban tab-menu na vrhu stranice. Lokator po href-u je nezavisan od jezika.
  const analyticsNav = page
    .locator('[data-admin-sidebar] [data-admin-navigation]')
    .locator('a[href="/admin/analytics"], a[href="/admin/analytics?tab=clients"], a[href="/admin/analytics?tab=stylists"]')
  await expect(analyticsNav).toHaveCount(3)
  await expect(analyticsNav.nth(0)).toHaveAttribute('aria-current', 'page')
  await analyticsNav.nth(0).focus()
  await page.keyboard.press('Tab')
  await expect(analyticsNav.nth(1)).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(analyticsNav.nth(2)).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/tab=stylists/)
  await expect(analyticsNav.nth(2)).toHaveAttribute('aria-current', 'page')
  await analyticsNav.nth(0).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/admin\/analytics$/)
  const summary = page.getByText(/prikaži podatke grafa u tabeli|show data table/i)
  await summary.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('table', { name: /mjesečn|monthly/i })).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('table', { name: /mjesečn|monthly/i })).toBeHidden()
})

test('client analytics retains incomplete deep-link date and reports request failure until corrected', async ({ page }) => {
  const queries: string[] = []
  await page.route('**/api/users/fixture-client/analytics**', route => {
    const url = new URL(route.request().url())
    queries.push(url.search)
    return route.fulfill(url.searchParams.has('toDate') ? { json: clientAnalyticsFixture } : { status: 400, json: {} })
  })
  await page.route('**/api/client-debts?**', route => route.fulfill({ json: [] }))
  await page.goto('/admin/analytics?tab=clients&userId=fixture-client&fromDate=2026-01-01', { waitUntil: 'networkidle' })
  await expect(page.getByRole('alert')).toBeVisible()
  expect(new URLSearchParams(queries[0]).get('fromDate')).toBe('2026-01-01')
  expect(new URLSearchParams(queries[0]).has('toDate')).toBe(false)
  await expect(page.locator('#client-from')).toHaveValue('2026-01-01')
  await page.locator('#client-to').fill('2026-01-31')
  await page.getByRole('button', { name: /primijeni period|apply period/i }).click()
  await expect(page.getByRole('heading', { name: 'Primjer Klijent' })).toBeVisible()
  expect(new URLSearchParams(queries[1]).get('toDate')).toBe('2026-01-31')
})

for (const mode of ['light', 'dark'] as const) {
  for (const viewport of ['desktop', 'mobile'] as const) {
    test(`client analytics details and keyboard ${mode} ${viewport}`, async ({ page }) => {
      await page.setViewportSize(viewport === 'desktop' ? { width: 1440, height: 900 } : { width: 320, height: 720 })
      await page.addInitScript(value => { localStorage.removeItem('nejra.theme'); localStorage.setItem('nejra.theme.mode', value) }, mode)
      await page.route('**/api/settings/public', async route => {
        const response = await route.fetch()
        const rows = await response.json() as Array<{ key: string; value: string }>
        await route.fulfill({ response, json: [...rows.filter(row => !['theme_active_skin', 'theme_default_mode'].includes(row.key)), { key: 'theme_active_skin', value: 'aurum' }, { key: 'theme_default_mode', value: mode }] })
      })
      const fixture = { ...clientAnalyticsFixture,
        topServices: [{ name: 'Test Usluga', count: 1, totalSpent: 42 }],
        reservations: [{ id: 'reservation-one', reservationDate: '2026-01-15', startTime: '10:00', endTime: '11:00', status: 'COMPLETED', clientNotes: 'Napomena rezervacije', cancelReason: null, cancelledAt: null, service: { id: 'service-one', name: 'Test Usluga', price: 42 } }],
        manualEntries: [{ id: 'manual-one', date: '2026-01-15', actualPrice: 42, tipAmount: 2, isManual: true, notes: 'Test unos', status: 'COMPLETED', service: { id: 'service-one', name: 'Test Usluga', price: 42 } }],
        reviews: [{ id: 'review-one', serviceRating: 5, stylistRating: 4, comment: 'Odličan tretman', isApproved: true, createdAt: '2026-01-16T12:00:00Z', service: { name: 'Test Usluga' } }],
      }
      await page.route('**/api/users/fixture-client/analytics**', route => route.fulfill({ json: fixture }))
      await page.route('**/api/client-debts?**', route => route.fulfill({ json: [{ id: 'debt-one', amount: 15, createdAt: '2026-01-16T12:00:00Z', status: 'OPEN', service: { id: 'service-one', name: 'Test Usluga' } }] }))
      await page.goto('/admin/analytics?tab=clients&userId=fixture-client', { waitUntil: 'networkidle' })
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      await expect(page.getByRole('table', { name: /potrosnje po uslugama|spending by service/i })).toBeVisible()
      const reservationTable = page.getByRole('table', { name: /tabela rezervacija klijenta|client reservations/i })
      await expect(reservationTable).toContainText('Test Usluga')
      const trigger = reservationTable.getByRole('button', { name: /detalji|details/i })
      await trigger.focus()
      await page.keyboard.press('Enter')
      const dialog = page.getByRole('dialog')
      await expect(dialog).toContainText('Napomena rezervacije')
      await settleAnimations(page)
      const reservationAxe = await new AxeBuilder({ page }).include('[data-client-analytics-dialog]').withTags([...AXE_RULE_TAGS, 'wcag2aaa']).analyze()
      console.log(`ANALYTICS_DIALOG_reservation_${mode}_${viewport} ${JSON.stringify({ violations: reservationAxe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: reservationAxe.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) })}`)
      expect(reservationAxe.violations.filter(v => v.id !== 'color-contrast-enhanced')).toEqual([])
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      await expect(trigger).toBeFocused()
      const reservationsTab = page.getByRole('tab', { name: /rezervacije|reservations/i })
      await reservationsTab.focus()
      await page.keyboard.press('ArrowRight')
      await expect(page.getByRole('tab', { name: /manuelni prihodi|manual entries/i })).toHaveAttribute('aria-selected', 'true')
      await expect(page.getByRole('table', { name: /tabela rucnih unosa|manual entries/i })).toContainText('Test unos')
      await page.keyboard.press('ArrowRight')
      await expect(page.getByRole('tab', { name: /dugovanja|debts/i })).toHaveAttribute('aria-selected', 'true')
      await expect(page.getByRole('tabpanel')).toContainText('15')
      await page.keyboard.press('ArrowRight')
      await expect(page.getByRole('tab', { name: /recenzije|reviews/i })).toHaveAttribute('aria-selected', 'true')
      const review = page.getByRole('button', { name: /otvori detalje recenzije|review details/i })
      await expect(review).toBeVisible()
      await review.focus()
      await page.keyboard.press('Enter')
      await expect(dialog).toContainText('Odličan tretman')
      await settleAnimations(page)
      const reviewAxe = await new AxeBuilder({ page }).include('[data-client-analytics-dialog]').withTags([...AXE_RULE_TAGS, 'wcag2aaa']).analyze()
      console.log(`ANALYTICS_DIALOG_review_${mode}_${viewport} ${JSON.stringify({ violations: reviewAxe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: reviewAxe.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) })}`)
      expect(reviewAxe.violations.filter(v => v.id !== 'color-contrast-enhanced')).toEqual([])
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      await expect(review).toBeFocused()
      for (const name of [/rezervacije|reservations/i, /manuelni prihodi|manual entries/i, /dugovanja|debts/i, /recenzije|reviews/i]) {
        await page.getByRole('tab', { name }).click()
        await settleAnimations(page)
        const scan = await new AxeBuilder({ page }).include('[data-analytics-hub]').withTags([...AXE_RULE_TAGS, 'wcag2aaa']).analyze()
        console.log(`ANALYTICS_CLIENT_TAB_${mode}_${viewport}_${name.source} ${JSON.stringify({ violations: scan.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: scan.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) })}`)
        expect(scan.violations.filter(v => v.id !== 'color-contrast-enhanced')).toEqual([])
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    })
  }
}

test('analytics renders English navigation, empty data and recoverable errors', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('APP_LOCALE', 'en'))
  let fail = false
  await page.route('**/api/analytics/dashboard**', route => route.fulfill(fail ? { status: 500, json: {} } : { json: { ...analyticsDashboardFixture, monthlyFinance: [], stylistPerformance: [], topServices: [], periodFinance: { ...analyticsDashboardFixture.periodFinance, expensesByCategory: [] } } }))
  await page.goto('/admin/analytics', { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible()
  await expect(page.locator('[data-admin-sidebar] [data-admin-navigation] a[href="/admin/analytics"]')).toHaveAttribute('aria-current', 'page')
  await expect(page.locator('[data-analytics-hub]')).not.toContainText('adminAnalytics.')
  fail = true
  await page.locator('#analytics-period').selectOption('thisMonth')
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('alert').getByRole('button', { name: /retry|try again/i })).toBeVisible()
  fail = false
  await page.getByRole('alert').getByRole('button', { name: /retry|try again/i }).click()
  await expect(page.getByRole('alert')).toBeHidden()
  await page.locator('[data-admin-sidebar] [data-admin-navigation] a[href="/admin/analytics?tab=stylists"]').click()
  await expect(page.getByText(/select a stylist/i)).toBeVisible()
})

test('settings sidebar is grouped while existing settings tab deep links remain reachable', async ({ page }) => {
  await page.goto('/admin/settings?tab=email', { waitUntil: 'networkidle' })
  const nav = page.getByRole('navigation', { name: /kategorije postavki|settings categories/i })
  await expect(nav.locator('a[href="/admin/settings?tab=email"]')).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('a[href="/admin/settings?tab=notifications"]')).toHaveCount(1)
  await expect(nav.locator('a[href="/admin/settings?tab=releases"]')).toHaveCount(1)
  await expect(page.locator('[data-admin-sidebar] a[href="/admin/settings"]')).toHaveAttribute('aria-current', 'page')
})

// ─── Faza F (7/) — child proofs + Aurum dark admin sweep (owner odluke 2026-11-18) ──────────────
//
// 1. Child proofs: `/admin/analytics?tab=clients` i `?tab=stylists` su lazy paneli unutar
//    `AnalyticsHub`-a, pa se NIKAD ne vide u ADMIN_ROUTES sweepu (tamo je samo hub na
//    `/admin/analytics` bez ?tab=). Ovdje ih renderujemo POPULIRANO (fiksturama) i axe-amo,
//    u oba Aurum režima; `recordAxeCoverage` ih bilježi kao sopstvene rute.
// 2. Aurum dark sweep: svih 15 admin ruta u Aurum dark-u (defaultni ADMIN_ROUTES sweep je
//    classic light); cilj: 1.4.6/1.4.3 dokaz na istim stranicama koje axe nikad nije mjerio
//    u Aurum dark-u (javne rute pokriva theme-policy.spec; admin rute nijedne).
//    Assert je isti kao postojeći Aurum admin blok (`assertableViolations` = prazno).
// 3. Aurum light sweep (2026-11-19, owner odluka — simetrija dark sweepa): isti posao za
//    Aurum light admin rute (ranije nijedna admin ruta nije mjerena u Aurum light-u; javne
//    rute i dalje pokriva theme-policy.spec). Isti assert, AAA samo u log.

const configureAurumTheme = async (page: Page, mode: 'light' | 'dark') => {
  await page.addInitScript((selectedMode) => {
    localStorage.removeItem('nejra.theme')
    localStorage.setItem('nejra.theme.mode', selectedMode)
  }, mode)
  await page.route('**/api/settings/public', async (route) => {
    const response = await route.fetch()
    if (!response.ok()) throw new Error(`Public settings failed: ${response.status()}`)
    const rows = await response.json() as Array<{ key: string; value: string }>
    await route.fulfill({ response, json: [
      ...rows.filter((row) => row.key !== 'theme_active_skin' && row.key !== 'theme_default_mode'),
      { key: 'theme_active_skin', value: 'aurum' },
      { key: 'theme_default_mode', value: mode },
    ] })
  })
}

const populatedClientAnalyticsFixture = {
  ...clientAnalyticsFixture,
  stats: { ...clientAnalyticsFixture.stats, totalReservations: 2, completedReservations: 1, totalSpent: 84, avgServiceRating: 4.5, reviewCount: 1 },
  topServices: [{ name: 'Žensko šišanje', count: 2, totalSpent: 84 }],
  reservations: [
    { id: 'res-one', reservationDate: '2026-02-03', startTime: '10:00', endTime: '10:45', status: 'COMPLETED', clientNotes: null, cancelReason: null, cancelledAt: null,
      service: { id: 'service-one', name: 'Žensko šišanje', price: 42 },
      confirmedStylist: { user: { firstName: 'Primjer', lastName: 'Stilista', username: 'primjer.stilista' } } },
    { id: 'res-two', reservationDate: '2026-02-10', startTime: '12:00', endTime: '12:30', status: 'CONFIRMED', clientNotes: 'Prvi put', cancelReason: null, cancelledAt: null,
      service: { id: 'service-two', name: 'Muško šišanje', price: 42 } },
  ],
  reviews: [
    { id: 'review-one', serviceRating: 5, stylistRating: 5, comment: 'Odlična usluga.', isApproved: true, createdAt: '2026-02-04T10:00:00Z',
      service: { name: 'Žensko šišanje' },
      stylist: { user: { firstName: 'Primjer', lastName: 'Stilista', username: 'primjer.stilista' } } },
  ],
  manualEntries: [
    { id: 'manual-one', date: '2026-02-11', actualPrice: 20, tipAmount: 2, isManual: true, notes: 'Dopuna porudžbine', status: 'COMPLETED',
      service: { id: 'service-three', name: 'Pranje kose', price: 20 } },
  ],
}

const clientDebtFixture = {
  id: 'debt-one', amount: 25, createdAt: '2026-02-05T09:00:00Z', status: 'OPEN',
  service: { id: 'service-one', name: 'Žensko šišanje' },
  reservation: { id: 'res-one', publicReferenceCode: 'DK-2026-0001', reservationDate: '2026-02-03', startTime: '10:00', endTime: '10:45' },
  dailyLogEntry: null,
  manualEntry: null,
  stylistProfile: { user: { firstName: 'Primjer', lastName: 'Stilista', username: 'primjer.stilista' } },
}

const populatedStylistAnalyticsFixture = {
  stylist: { id: 'fixture-stylist', name: 'Primjer Stilista', user: { id: 'stylist-user', username: 'primjer.stilista', email: 'stilista@example.com', firstName: 'Primjer', lastName: 'Stilista' } },
  fromDate: null, toDate: null,
  completedCount: 24, revenue: 960, tips: 58,
  topServices: [
    { serviceId: 'service-one', serviceName: 'Žensko šišanje', count: 15, revenue: 630 },
    { serviceId: 'service-two', serviceName: 'Muško šišanje', count: 9, revenue: 330 },
  ],
  recentEntries: [
    { id: 'entry-one', date: '2026-02-12', serviceName: 'Žensko šišanje', clientName: 'Adis Hodžić', actualPrice: 42, tipAmount: 4 },
    { id: 'entry-two', date: '2026-02-10', serviceName: 'Muško šišanje', clientName: null, actualPrice: 35, tipAmount: 0 },
  ],
}

const aaaDetail = (violations: Array<{ id: string; tags: string[]; nodes: Array<{ target: unknown[]; failureSummary?: string }> }>) =>
  violations
    .filter((v) => v.tags.includes('wcag2aaa'))
    .map((v) => ({ id: v.id, nodes: v.nodes.length }))

for (const mode of ['light', 'dark'] as const) {
  test(`Aurum ${mode} child proof: /admin/analytics?tab=clients (populated)`, async ({ page }) => {
    await configureAurumTheme(page, mode)
    await page.route('**/api/users/fixture-client/analytics**', (route) => route.fulfill({ json: populatedClientAnalyticsFixture }))
    await page.route('**/api/client-debts?**', (route) => route.fulfill({ json: [clientDebtFixture] }))
    await page.goto('/admin/analytics?tab=clients&userId=fixture-client', { waitUntil: 'networkidle' })
    const url = new URL(page.url())
    expect(url.pathname).toBe('/admin/analytics')
    expect(url.searchParams.get('tab')).toBe('clients')
    await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
    await expect(page.getByRole('heading', { name: 'Primjer Klijent' })).toBeVisible()
    const settled = await settleAnimations(page)
    expect(settled).not.toBeNull()
    expect(settled?.stillRunning).toBe(0)
    const results = await new AxeBuilder({ page }).withTags(AXE_RULE_TAGS).analyze()
    recordAxeCoverage(test.info().project.name, `/admin/analytics?tab=clients (aurum-${mode})`, results, defaultCoverageDir())
    console.log(`CHILD_CLIENTS_${mode.toUpperCase()}_AAA ${JSON.stringify(aaaDetail(results.violations))}`)
    expect(assertableViolations(results.violations)).toEqual([])
  })

  test(`Aurum ${mode} child proof: /admin/analytics?tab=stylists (populated)`, async ({ page }) => {
    await configureAurumTheme(page, mode)
    await page.route('**/api/stylists/fixture-stylist/analytics**', (route) => route.fulfill({ json: populatedStylistAnalyticsFixture }))
    await page.goto('/admin/analytics?tab=stylists&stylistId=fixture-stylist', { waitUntil: 'networkidle' })
    const url = new URL(page.url())
    expect(url.pathname).toBe('/admin/analytics')
    expect(url.searchParams.get('tab')).toBe('stylists')
    await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
    await expect(page.getByRole('heading', { name: 'Primjer Stilista' })).toBeVisible()
    const settled = await settleAnimations(page)
    expect(settled).not.toBeNull()
    expect(settled?.stillRunning).toBe(0)
    const results = await new AxeBuilder({ page }).withTags(AXE_RULE_TAGS).analyze()
    recordAxeCoverage(test.info().project.name, `/admin/analytics?tab=stylists (aurum-${mode})`, results, defaultCoverageDir())
    console.log(`CHILD_STYLISTS_${mode.toUpperCase()}_AAA ${JSON.stringify(aaaDetail(results.violations))}`)
    expect(assertableViolations(results.violations)).toEqual([])
  })
}

for (const route of ADMIN_ROUTES) {
  test(`Aurum dark admin rendered axe (sweep): ${route.name} (${route.path})`, async ({ page }) => {
    await configureAurumTheme(page, 'dark')
    await page.goto(route.path, { waitUntil: 'networkidle' })
    const url = new URL(page.url())
    expect(url.pathname).toBe(route.path)
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark')
    const settled = await settleAnimations(page)
    expect(settled).not.toBeNull()
    expect(settled?.stillRunning).toBe(0)
    const results = await new AxeBuilder({ page }).withTags(AXE_RULE_TAGS).analyze()
    recordAxeCoverage(test.info().project.name, `${route.path} (aurum-dark)`, results, defaultCoverageDir())
    console.log(`ADMIN_DARK_AAA ${route.path} ${JSON.stringify(aaaDetail(results.violations))}`)
    expect(assertableViolations(results.violations)).toEqual([])
  })
}

for (const route of ADMIN_ROUTES) {
  test(`Aurum light admin rendered axe (sweep): ${route.name} (${route.path})`, async ({ page }) => {
    await configureAurumTheme(page, 'light')
    await page.goto(route.path, { waitUntil: 'networkidle' })
    const url = new URL(page.url())
    expect(url.pathname).toBe(route.path)
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'light')
    const settled = await settleAnimations(page)
    expect(settled).not.toBeNull()
    expect(settled?.stillRunning).toBe(0)
    const results = await new AxeBuilder({ page }).withTags(AXE_RULE_TAGS).analyze()
    recordAxeCoverage(test.info().project.name, `${route.path} (aurum-light)`, results, defaultCoverageDir())
    console.log(`ADMIN_LIGHT_AAA ${route.path} ${JSON.stringify(aaaDetail(results.violations))}`)
    expect(assertableViolations(results.violations)).toEqual([])
  })
}

// M2: 320 CSS px je približan viewportu desktopa širine 1280 px na 400% zoomu,
// ne zamjenjuje stvarni browser zoom, provjeru sadržaja ni rad s tipkovnicom.
// Provjeravaju se samo učitana početna stanja 15 ruta, u oba Aurum režima.
for (const mode of ['light', 'dark'] as const) {
  for (const route of ADMIN_ROUTES) {
    test(`M2 320px Aurum ${mode}: ${route.name} (${route.path})`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 720 })
      await configureAurumTheme(page, mode)
      await page.goto(route.path, { waitUntil: 'networkidle' })
      expect(new URL(page.url()).pathname).toBe(route.path)
      await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      const settled = await settleAnimations(page)
      expect(settled).not.toBeNull()
      expect(settled?.stillRunning).toBe(0)
      const measurement = await page.evaluate(() => {
        const width = document.documentElement.clientWidth
        return {
          width,
          scrollWidth: document.documentElement.scrollWidth,
          root: { bodyWidth: document.body.clientWidth, bodyScrollWidth: document.body.scrollWidth, bodyRight: Math.round(document.body.getBoundingClientRect().right) },
          scrollers: Array.from(document.body.querySelectorAll('*')).filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === 'visible').slice(0, 10).map((el) => ({ tag: el.tagName, class: el.getAttribute('class')?.slice(0, 100), scroll: el.scrollWidth, width: el.clientWidth })),
          outside: Array.from(document.body.querySelectorAll('*'))
            .filter((el) => {
              const rect = el.getBoundingClientRect()
              const style = getComputedStyle(el)
              return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.right > width + 1
            })
            .slice(0, 8)
            .map((el) => ({ tag: el.tagName, class: el.getAttribute('class')?.slice(0, 100), right: Math.round(el.getBoundingClientRect().right) })),
        }
      })
      expect(measurement.width).toBe(320)
      if (measurement.scrollWidth > measurement.width + 1) {
        reportAdmin(`M2 320 ${mode} ${route.path}`, JSON.stringify(measurement))
      }
      expect(measurement.scrollWidth - measurement.width, JSON.stringify(measurement)).toBeLessThanOrEqual(1)
    })
  }
}

// O4 greške nosimo u CI anotaciju: artefakti i puni logovi nisu uvijek dostupni u sandboxu.
test.afterEach(async ({}, info) => {
  if (info.title.startsWith('O4 ') && info.status !== info.expectedStatus) {
    const detail = info.errors.map((error) => error.message || String(error)).join(' | ').slice(0, 2200)
    reportAdmin(`O4 ${info.title}`, detail)
  }
})

// O4 preostali tokovi: svi podaci i mutacije su izolovani Playwright fiksurama.
// Odustajanje ne šalje mutaciju; potvrda šalje samo odgovarajući zahtjev.
async function exerciseO4Confirmation(
  page: Page,
  trigger: import('@playwright/test').Locator,
  description: RegExp,
  getCount: () => number,
  confirmName = /^(obriši|delete|potvrdi|confirm)$/i,
) {
  await expect(trigger).toBeVisible()
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: /potvrdi brisanje|confirm deletion|potvrda|confirmation/i })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText(description)
  expect(getCount()).toBe(0)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
  expect(getCount()).toBe(0)
  await trigger.click()
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: confirmName }).click()
  await expect.poll(getCount).toBe(1)
}

const o4Post = { id: 'o4-post', title: 'O4 članak', slug: 'o4-clanak', content: 'Primjer', language: 'bs', isPublished: true, createdAt: '2026-01-01T10:00:00Z' }
const o4Comment = { id: 'o4-comment', content: 'O4 komentar', isApproved: true, createdAt: '2026-01-01T10:00:00Z', user: { username: 'primjer', firstName: 'Primjer', lastName: 'Klijent' } }
const o4Category = { id: 'o4-category', name: 'O4 kategorija', description: null, sortOrder: 0, autoPublishConsentedPairs: false, _count: { images: 1 } }
const o4Image = { id: 'o4-image', title: 'O4 slika', description: null, sortOrder: 0 }

for (const kind of ['post', 'comment'] as const) {
  test(`O4 blog ${kind}: cancel and confirm isolated deletion`, async ({ page }) => {
    const target = kind === 'post' ? '/api/blog/o4-post' : '/api/blog/comments/o4-comment'
    let count = 0
    await page.route('**/api/blog/admin', route => route.fulfill({ json: [o4Post] }))
    await page.route('**/api/blog/o4-post/comments/admin', route => route.fulfill({ json: [o4Comment] }))
    await page.route(`**${target}`, route => {
      expect(route.request().method()).toBe('DELETE')
      count++
      return route.fulfill({ json: {} })
    })
    await page.goto('/admin/blog', { waitUntil: 'networkidle' })
    let trigger = page.getByRole('table').getByRole('button', { name: /^(obriši|delete)$/i }).first()
    if (kind === 'comment') {
      await page.getByRole('button', { name: /^(komentari|comments)$/i }).first().click()
      const parent = page.getByRole('dialog', { name: /O4 članak/ })
      await expect(parent.getByText('O4 komentar')).toBeVisible()
      trigger = parent.getByRole('button', { name: /^(obriši|delete)$/i })
    }
    await exerciseO4Confirmation(page, trigger, kind === 'post' ? /obrisati članak|delete.*post/i : /obrisati komentar|delete.*comment/i, () => count)
  })
}

for (const kind of ['category', 'image'] as const) {
  test(`O4 gallery ${kind}: cancel and confirm isolated deletion`, async ({ page }) => {
    const target = kind === 'category' ? '/api/gallery/categories/o4-category' : '/api/gallery/images/o4-image'
    let count = 0
    await page.route('**/api/gallery/categories', route => route.fulfill({ json: [o4Category] }))
    await page.route('**/api/gallery/categories/o4-category', route => {
      if (route.request().method() === 'GET') return route.fulfill({ json: { ...o4Category, images: [o4Image] } })
      expect(kind).toBe('category')
      expect(route.request().method()).toBe('DELETE')
      count++
      return route.fulfill({ json: {} })
    })
    if (kind === 'image') await page.route(`**${target}`, route => {
      expect(route.request().method()).toBe('DELETE')
      count++
      return route.fulfill({ json: {} })
    })
    await page.goto('/admin/gallery', { waitUntil: 'networkidle' })
    if (kind === 'image') await page.getByRole('button', { name: /O4 kategorija/ }).click()
    const trigger = page.getByRole('button', { name: /^(obriši|delete)$/i }).nth(kind === 'category' ? 0 : 1)
    await exerciseO4Confirmation(page, trigger, kind === 'category' ? /kategoriju i sve njene slike|category and all/i : /obrisati sliku|delete.*image/i, () => count)
  })
}

test('O4 review from details: nested confirmation preserves cancellation and sends delete', async ({ page }) => {
  const review = { id: 'o4-review', serviceRating: 5, stylistRating: null, comment: 'O4 recenzija', isApproved: true, createdAt: '2026-01-01T10:00:00Z' }
  let count = 0
  await page.route(/\/api\/reviews\/admin(?:\?.*)?$/, route => route.fulfill({ json: [review] }))
  await page.route('**/api/reviews/o4-review', route => { expect(route.request().method()).toBe('DELETE'); count++; return route.fulfill({ json: {} }) })
  await page.goto('/admin/reviews', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /detalji recenzije|review details/i }).click()
  const parent = page.getByRole('dialog', { name: /detalji recenzije|review details/i })
  await expect(parent.getByText('O4 recenzija')).toBeVisible()
  await exerciseO4Confirmation(page, parent.getByRole('button', { name: /^(obriši|delete)$/i }), /obrisati recenziju|delete.*review/i, () => count)
})

test('O4 salon holiday: cancel and confirm isolated deletion', async ({ page }) => {
  const salon = { id: 'o4-salon', name: 'O4 salon', workingHours: [{ dayOfWeek: 1, openTime: '09:00', closeTime: '17:00', isWorkingDay: true }], holidays: [{ id: 'o4-holiday', name: 'O4 praznik', date: '2026-12-25', message: null, sendPush: false, pushSentAt: null }] }
  let count = 0
  await page.route('**/api/salon/list', route => route.fulfill({ json: [salon] }))
  await page.route('**/api/salon/o4-salon', route => route.fulfill({ json: salon }))
  await page.route('**/api/salon/holidays/o4-holiday', route => { expect(route.request().method()).toBe('DELETE'); count++; return route.fulfill({ json: {} }) })
  await page.goto('/admin/salon', { waitUntil: 'networkidle' })
  const holidaysTab = page.getByRole('tab', { name: /praznici|holidays/i })
  await expect(holidaysTab, 'O4 salon fixture must load before testing the holiday confirmation').toBeVisible({ timeout: 10_000 })
  await holidaysTab.click()
  await exerciseO4Confirmation(page, page.getByRole('table').getByRole('button', { name: /^(obriši praznik|delete holiday): O4 praznik/i }), /praznik|holiday/i, () => count)
})

for (const kind of ['category', 'subcategory'] as const) {
  test(`O4 services ${kind}: cancel and confirm isolated deletion`, async ({ page }) => {
    let count = 0
    await page.route('**/api/services/admin/categories?**', route => route.fulfill({ json: [{ id: 'o4-cat', name: 'O4 usluge', isActive: true }] }))
    await page.route('**/api/services/admin/subcategories?**', route => route.fulfill({ json: [{ id: 'o4-sub', categoryId: 'o4-cat', name: 'O4 podkategorija', isActive: true }] }))
    await page.route('**/api/services/admin/services?**', route => route.fulfill({ json: [] }))
    await page.route(`**/api/services/${kind === 'category' ? 'categories/o4-cat' : 'subcategories/o4-sub'}`, route => { expect(route.request().method()).toBe('DELETE'); count++; return route.fulfill({ json: {} }) })
    await page.goto('/admin/services', { waitUntil: 'networkidle' })
    if (kind === 'subcategory') await page.getByRole('button', { name: /O4 usluge/ }).first().click()
    const trigger = page.getByRole('button', { name: kind === 'category' ? /^(obriši kategoriju|delete category): O4 usluge$/i : /^(obriši potkategoriju|delete subcategory): O4 podkategorija$/i })
    await exerciseO4Confirmation(page, trigger, kind === 'category' ? /kategoriju i sve potkategorije|category and all subcategories/i : /potkategoriju i sve usluge|subcategory and all services/i, () => count)
  })
}

test('O4 SMTP password: cancel retains configured state; confirm only clears on save', async ({ page }) => {
  const writes: { key: string; value: unknown }[] = []
  await page.route('**/api/settings', route => route.fulfill({ json: [
    { key: 'system_email_password', value: '', isConfigured: true },
    { key: 'system_notif_email_from', value: 'fixture@example.test' },
  ] }))
  await page.route(/\/api\/settings\/[^/?]+$/, route => {
    if (route.request().method() !== 'PUT') return route.fallback()
    expect(route.request().method()).toBe('PUT')
    writes.push({ key: new URL(route.request().url()).pathname.split('/').pop()!, value: route.request().postDataJSON().value })
    return route.fulfill({ json: {} })
  })
  await page.goto('/admin/settings?tab=email', { waitUntil: 'networkidle' })
  const trigger = page.getByRole('button', { name: /obriši lozinku|clear password/i })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: /potvrdi brisanje|confirm deletion/i })
  await expect(dialog).toContainText(/SMTP lozinku|SMTP password/i)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
  expect(writes).toEqual([])
  await trigger.click()
  await dialog.getByRole('button', { name: /obriši lozinku|clear password/i }).click()
  await expect(trigger).toBeHidden()
  expect(writes).toEqual([])
  await page.getByRole('button', { name: /sačuvaj email postavke|save email settings/i }).first().click()
  await expect.poll(() => writes.filter(row => row.key === 'system_email_password').length).toBe(1)
  expect(writes.find(row => row.key === 'system_email_password')?.value).toBe('')
})

test('O4 campaign retry: uncertain delivery requires confirmation and carries at-least-once acknowledgement', async ({ page }) => {
  const campaign = { id: 'o4-template', name: 'O4 kampanja', html: '<p>O4</p>', blocks: [] }
  const job = { id: 'o4-job', status: 'FAILED', totalRecipients: 1, counts: { pending: 0, processing: 0, delivered: 0, skipped: 0, failed: 1, cancelled: 0 }, recipients: [{ id: 'o4-recipient', username: 'primjer', status: 'FAILED' }] }
  let retries = 0
  await page.route('**/api/settings', route => route.fulfill({ json: [{ key: 'system_email_campaign_templates', value: JSON.stringify([campaign]) }] }))
  await page.route('**/api/notifications/campaigns/audience', route => route.fulfill({ json: { total: 1, maxRecipients: 100, exceedsLimit: false, sample: [{ username: 'primjer' }] } }))
  await page.route('**/api/notifications/campaigns/send', route => route.fulfill({ json: { queued: true, jobId: 'o4-job', totalTargeted: 1 } }))
  await page.route('**/api/notifications/campaigns/o4-job', route => route.fulfill({ json: job }))
  await page.route('**/api/notifications/campaigns/o4-job/retry', route => {
    expect(route.request().method()).toBe('POST')
    const payload = route.request().postDataJSON()
    expect(payload.confirmAtLeastOnce).toBe(true)
    expect(payload.requestId).toMatch(/^[0-9a-f-]{36}$/i)
    retries++
    return route.fulfill({ json: { ...job, ok: true } })
  })
  await page.goto('/admin/settings?tab=email', { waitUntil: 'networkidle' })
  await page.getByRole('tab', { name: /kampanje|campaigns/i }).click()
  await page.getByRole('button', { name: /izračunaj publiku|calculate audience/i }).click()
  await page.getByRole('button', { name: /pošalji kampanju|send campaign/i }).click()
  const trigger = page.getByRole('button', { name: /ponovi neuspjele isporuke|retry failed deliveries/i })
  await exerciseO4Confirmation(page, trigger, /može poslati email ponovo|could send an email again/i, () => retries)
})


// M2 dopunska provjera: admin rute, početna stanja.
// Ovo su simulacije povećanja teksta i razmaka, NE stvarni zoom ili ručni pregled.
const M2_PRIORITY_ROUTES = [
  '/admin/users',
  '/admin/reservations',
  '/admin/reservations/calendar',
  '/admin/finance',
  '/admin/settings',
] as const
// Preostalih deset ruta iz istog inventara; dinamični detalji i tabovi nisu pokriveni.
const M2_REMAINING_ADMIN_ROUTES = ADMIN_ROUTES.map(route => route.path)
  .filter(path => !M2_PRIORITY_ROUTES.some(priority => priority === path))
const M2_TEXT_SPACING = `
  *, *::before, *::after {
    line-height: 1.5 !important;
    letter-spacing: 0.12em !important;
    word-spacing: 0.16em !important;
  }
  p { margin-bottom: 2em !important; }
`
for (const mode of ['light', 'dark'] as const) {
  for (const path of [...M2_PRIORITY_ROUTES, ...M2_REMAINING_ADMIN_ROUTES]) {
    const group = M2_PRIORITY_ROUTES.some(priority => priority === path) ? 'priority' : 'remaining'
    for (const adjustment of ['text-200', 'text-spacing'] as const) {
      test(`M2 ${group} ${mode} ${adjustment}: ${path}`, async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 })
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await configureAurumTheme(page, mode)
        await page.goto(path, { waitUntil: 'networkidle' })
        expect(new URL(page.url()).pathname).toBe(path)
        await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
        await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
        const settled = await settleAnimations(page)
        expect(settled).not.toBeNull()
        expect(settled?.stillRunning).toBe(0)
        const before = await page.evaluate(clippedSnapshot)
        if (adjustment === 'text-200') {
          const base = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
          await page.evaluate(size => { document.documentElement.style.fontSize = `${size * 2}px` }, base)
          await expect.poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))).toBeCloseTo(base * 2, 2)
        } else {
          await page.addStyleTag({ content: M2_TEXT_SPACING })
        }
        await settleAnimations(page)
        const after = await page.evaluate(clippedSnapshot)
        const newlyClipped = Object.keys(after).filter(key => !(key in before)).map(key => ({ element: key, ...after[key] }))
        if (newlyClipped.length) reportAdmin(`M2 ${group} ${mode} ${adjustment} ${path}`, JSON.stringify(newlyClipped.slice(0, 8)))
        expect(newlyClipped, `${path} ${mode} ${adjustment}: newly clipped elements`).toEqual([])
        if (['/admin/reservations', '/admin/daily-log', '/admin/reviews'].includes(path) && adjustment === 'text-200') {
          const tableRegion = path === '/admin/reservations'
            ? page.getByRole('region', { name: /rezervacije|reservations/i }).filter({ has: page.locator('table') })
            : page.locator('[data-m2-scroll-region]')
          await expect(tableRegion).toHaveAttribute('role', 'region')
          await expect(tableRegion).toHaveAttribute('aria-label', /.+/)
          await expect.poll(() => tableRegion.evaluate(el => el.scrollWidth - el.clientWidth)).toBeGreaterThan(0)
          await expect.poll(() => tableRegion.getAttribute('tabindex')).toBe('0')
          await tableRegion.focus()
          await page.keyboard.press('ArrowRight')
          await expect.poll(() => tableRegion.evaluate(el => el.scrollLeft)).toBeGreaterThan(0)
        }
      })
    }
  }
}

// M2 populated analytics: overview, stylist profile, all client tabs and two detail dialogs.
// Fixtures are read-only; 320 CSS px and simulated text adjustments are not browser zoom.
const M2_ANALYTICS_STATES = ['overview', 'stylist', 'reservations', 'manual', 'debts', 'reviews', 'reservation-dialog', 'review-dialog'] as const
for (const mode of ['light', 'dark'] as const) {
  for (const state of M2_ANALYTICS_STATES) {
    for (const adjustment of ['320px', 'text-200', 'text-spacing'] as const) {
      test(`M2 analytics populated ${mode} ${state} ${adjustment}`, async ({ page }) => {
        await page.setViewportSize(adjustment === '320px' ? { width: 320, height: 720 } : { width: 1280, height: 900 })
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await configureAurumTheme(page, mode)
        await page.route('**/api/analytics/dashboard**', route => route.fulfill({ json: analyticsDashboardFixture }))
        await page.route('**/api/stylists/fixture-stylist/analytics**', route => route.fulfill({ json: populatedStylistAnalyticsFixture }))
        const client = {
          ...populatedClientAnalyticsFixture,
          reservations: [{ ...populatedClientAnalyticsFixture.reservations[0], clientNotes: 'Napomena rezervacije' }],
          reviews: [{ ...populatedClientAnalyticsFixture.reviews[0], comment: 'Odličan tretman' }],
        }
        await page.route('**/api/users/fixture-client/analytics**', route => route.fulfill({ json: client }))
        await page.route('**/api/client-debts?**', route => route.fulfill({ json: [clientDebtFixture] }))
        const tab = state === 'overview' ? null : state === 'stylist' ? 'stylists' : 'clients'
        const path = tab === null ? '/admin/analytics' : tab === 'stylists'
          ? '/admin/analytics?tab=stylists&stylistId=fixture-stylist'
          : '/admin/analytics?tab=clients&userId=fixture-client'
        await page.goto(path, { waitUntil: 'networkidle' })
        const url = new URL(page.url())
        expect(url.pathname).toBe('/admin/analytics')
        expect(url.searchParams.get('tab')).toBe(tab)
        await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
        await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
        if (state === 'overview') {
          await expect(page.locator('[data-analytics-hub]')).toContainText('Test Trošak')
        } else if (state === 'stylist') {
          await expect(page.getByRole('heading', { name: 'Primjer Stilista' })).toBeVisible()
          await expect(page.locator('[data-analytics-hub]')).toContainText('Adis Hodžić')
        } else {
          await expect(page.getByRole('heading', { name: 'Primjer Klijent' })).toBeVisible()
          const isReviews = state === 'reviews' || state === 'review-dialog'
          if (state === 'manual') await page.getByRole('tab', { name: /manuelni prihodi|manual entries/i }).click()
          if (state === 'debts') await page.getByRole('tab', { name: /dugovanja|debts/i }).click()
          if (isReviews) await page.getByRole('tab', { name: /recenzije|reviews/i }).click()
          const panel = page.getByRole('tabpanel')
          const expected = state === 'manual' ? 'Dopuna porudžbine' : state === 'debts' ? '25' : isReviews ? 'Odličan tretman' : 'Žensko šišanje'
          await expect(panel).toContainText(expected)
          if (state === 'reservation-dialog') {
            await page.getByRole('table', { name: /tabela rezervacija klijenta|client reservations/i }).getByRole('button', { name: /detalji|details/i }).click()
            await expect(page.getByRole('dialog')).toContainText('Napomena rezervacije')
          } else if (state === 'review-dialog') {
            await page.getByRole('button', { name: /otvori detalje recenzije|review details/i }).click()
            await expect(page.getByRole('dialog')).toContainText('Odličan tretman')
          }
        }
        const settled = await settleAnimations(page)
        expect(settled).not.toBeNull()
        expect(settled?.stillRunning).toBe(0)
        if (adjustment === '320px') {
          const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
          if (widths.scroll > widths.viewport + 1) reportAdmin(`M2 analytics ${mode} ${state} 320`, JSON.stringify(widths))
          expect(widths.viewport).toBe(320)
          expect(widths.scroll - widths.viewport).toBeLessThanOrEqual(1)
          if (state.endsWith('-dialog')) {
            const box = await page.getByRole('dialog').boundingBox()
            expect(box).not.toBeNull()
            expect(box!.x).toBeGreaterThanOrEqual(-1)
            expect(box!.x + box!.width).toBeLessThanOrEqual(321)
          }
        } else {
          const before = await page.evaluate(clippedSnapshot)
          if (adjustment === 'text-200') {
            const base = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
            await page.evaluate(size => { document.documentElement.style.fontSize = `${size * 2}px` }, base)
            await expect.poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))).toBeCloseTo(base * 2, 2)
          } else {
            await page.addStyleTag({ content: M2_TEXT_SPACING })
          }
          await settleAnimations(page)
          if (state === 'manual' && adjustment === 'text-200') {
            const region = page.getByRole('region', { name: /tabela rucnih unosa|manual entries/i })
            await expect.poll(() => region.evaluate(el => el.scrollWidth - el.clientWidth)).toBeGreaterThan(0)
            await expect.poll(() => region.getAttribute('tabindex')).toBe('0')
            await region.focus()
            await page.keyboard.press('ArrowRight')
            await expect.poll(() => region.evaluate(el => el.scrollLeft)).toBeGreaterThan(0)
            const note = page.locator('[data-analytics-manual-note]')
            await expect(note).toContainText('Dopuna porudžbine')
            expect(await note.evaluate(el => ({ overflow: getComputedStyle(el).overflowX, whitespace: getComputedStyle(el).whiteSpace }))).toEqual({ overflow: 'visible', whitespace: 'normal' })
          }
          const after = await page.evaluate(clippedSnapshot)
          const newlyClipped = Object.keys(after).filter(key => !(key in before)).map(key => ({ element: key, ...after[key] }))
          if (newlyClipped.length) reportAdmin(`M2 analytics ${mode} ${state} ${adjustment}`, JSON.stringify(newlyClipped.slice(0, 8)))
          expect(newlyClipped, `${state} ${mode} ${adjustment}: newly clipped elements`).toEqual([])
        }
      })
    }
  }
}

test.afterEach(async ({}, info) => {
  if (info.title.startsWith('M2 analytics populated') && info.status !== info.expectedStatus) {
    reportAdmin(info.title, info.errors.map(error => error.message || String(error)).join(' | ').slice(0, 2200))
  }
})

// M2 settings: populated notifications, preferences, release list and email editing states.
// Two languages and both Aurum modes; fixtures do not perform writes.
const M2_SETTINGS_STATES = ['notification-list', 'notification-preferences', 'releases', 'smtp-dialog', 'email-templates', 'email-campaign'] as const
for (const mode of ['light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const state of M2_SETTINGS_STATES) {
      for (const adjustment of ['320px', 'text-200', 'text-spacing'] as const) {
        test(`M2 settings populated ${mode} ${language} ${state} ${adjustment}`, async ({ page }) => {
          await page.setViewportSize(adjustment === '320px' ? { width: 320, height: 720 } : { width: 1280, height: 900 })
          await page.emulateMedia({ reducedMotion: 'reduce' })
          await configureAurumTheme(page, mode)
          await page.addInitScript(locale => localStorage.setItem('APP_LOCALE', locale), language)
          const campaign = { id: 'm2-campaign', name: 'M2 campaign fixture', html: '<p>Fixture</p>', blocks: [] }
          await page.route('**/api/settings', route => {
            expect(route.request().method()).toBe('GET')
            return route.fulfill({ json: [
              { key: 'system_email_password', value: '', isConfigured: true },
              { key: 'system_notif_email_from', value: 'fixture@example.test' },
              { key: 'system_email_campaign_templates', value: JSON.stringify([campaign]) },
            ] })
          })
          await page.route(/\/api\/notifications(?:\?.*)?$/, route => route.fulfill({ json: [{
            id: 'm2-notification', title: 'M2 notification fixture', body: 'Dodatna obavijest za provjeru prikaza.',
            type: 'RESERVATION_NEW', channel: 'EMAIL', isRead: false, sentAt: '2026-01-15T12:00:00Z', readAt: null,
          }] }))
          await page.route('**/api/notifications/preferences', route => route.fulfill({ json: [{ id: 'm2-pref', type: 'RESERVATION_NEW', pushEnabled: false, emailEnabled: true }] }))
          await page.route('**/api/notifications/campaigns/consent', route => route.fulfill({ json: { optedIn: true, consentedAt: '2026-01-15T12:00:00Z', withdrawnAt: null } }))
          await page.route('**/api/app-releases', route => route.fulfill({ json: [{
            id: 'm2-release', version: '9.9.9-M2', versionCode: 999, minSupportedVersionCode: 900,
            forceUpdate: true, apkSizeBytes: 10485760, releaseNotes: 'M2 release notes fixture', status: 'DRAFT',
          }] }))
          const tab = state.startsWith('notification-') ? 'notifications' : state === 'releases' ? 'releases' : 'email'
          const path = `/admin/settings?tab=${tab}`
          await page.goto(path, { waitUntil: 'networkidle' })
          const url = new URL(page.url())
          expect(url.pathname).toBe('/admin/settings')
          expect(url.searchParams.get('tab')).toBe(tab)
          await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
          await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
          await expect(page.locator('html')).toHaveAttribute('lang', language)
          await expect(page.locator(`a[href="/admin/settings?tab=${tab}"]`)).toHaveAttribute('aria-current', 'page')
          if (state === 'notification-list') {
            await expect(page.getByText('M2 notification fixture')).toBeVisible()
            await expect(page.getByRole('button', { name: /M2 notification fixture/ })).toBeVisible()
          } else if (state === 'notification-preferences') {
            await page.getByRole('tab', { name: /^preference(s)?$/i }).click()
            const pref = page.getByRole('switch', { name: /push (obavijesti za nova rezervacija|notifications for new reservation)/i })
            await expect(pref).toHaveAttribute('aria-checked', 'false')
            await expect(page.getByRole('switch', { name: /promotivne kampanje|promotional campaigns/i })).toHaveAttribute('aria-checked', 'true')
          } else if (state === 'releases') {
            await expect(page.getByText('9.9.9-M2', { exact: false })).toBeVisible()
            await expect(page.getByText('M2 release notes fixture')).toBeVisible()
          } else if (state === 'smtp-dialog') {
            const trigger = page.getByRole('button', { name: /obriši lozinku|clear password/i })
            await expect(page.locator('#email-smtp-host')).toBeVisible()
            await trigger.click()
            await expect(page.getByRole('dialog')).toContainText(/SMTP lozinku|SMTP password/i)
          } else if (state === 'email-templates') {
            await page.getByRole('tab', { name: /postojeći template|existing templates/i }).click()
            await expect(page.locator('#email-templates-existing-template-type')).toBeVisible()
            await expect(page.locator('#existing-email-subject')).toBeVisible()
          } else {
            await page.getByRole('tab', { name: /kampanje|campaigns/i }).click()
            await expect(page.locator('#email-campaign-selected-campaign-name')).toHaveValue('M2 campaign fixture')
          }
          const settled = await settleAnimations(page)
          expect(settled).not.toBeNull()
          expect(settled?.stillRunning).toBe(0)
          if (adjustment === '320px') {
            const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
            if (widths.scroll > widths.viewport + 1) reportAdmin(`M2 settings ${mode} ${language} ${state} 320`, JSON.stringify(widths))
            expect(widths.viewport).toBe(320)
            expect(widths.scroll - widths.viewport).toBeLessThanOrEqual(1)
            if (state === 'smtp-dialog') {
              const box = await page.getByRole('dialog').boundingBox()
              expect(box).not.toBeNull()
              expect(box!.x).toBeGreaterThanOrEqual(-1)
              expect(box!.x + box!.width).toBeLessThanOrEqual(321)
            }
          } else {
            const before = await page.evaluate(clippedSnapshot)
            if (adjustment === 'text-200') {
              const base = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
              await page.evaluate(size => { document.documentElement.style.fontSize = `${size * 2}px` }, base)
              await expect.poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))).toBeCloseTo(base * 2, 2)
            } else {
              await page.addStyleTag({ content: M2_TEXT_SPACING })
            }
            await settleAnimations(page)
            const after = await page.evaluate(clippedSnapshot)
            const newlyClipped = Object.keys(after).filter(key => !(key in before)).map(key => ({ element: key, ...after[key] }))
            if (newlyClipped.length) reportAdmin(`M2 settings ${mode} ${language} ${state} ${adjustment}`, JSON.stringify(newlyClipped.slice(0, 8)))
            expect(newlyClipped, `${state} ${mode} ${language} ${adjustment}: newly clipped elements`).toEqual([])
          }
          if (state === 'email-templates') {
            const preview = page.locator('[data-email-preview]')
            const code = page.locator('[data-email-preview-code]')
            await expect(code).toHaveText('123456')
            const bounds = await preview.evaluate(el => {
              const codeEl = el.querySelector('[data-email-preview-code]')!
              const outer = el.getBoundingClientRect()
              const inner = codeEl.getBoundingClientRect()
              return { previewOverflow: el.scrollWidth - el.clientWidth, codeOverflow: codeEl.scrollWidth - codeEl.clientWidth, left: inner.left - outer.left, right: inner.right - outer.right }
            })
            expect(bounds.previewOverflow, JSON.stringify(bounds)).toBeLessThanOrEqual(1)
            expect(bounds.codeOverflow, JSON.stringify(bounds)).toBeLessThanOrEqual(1)
            expect(bounds.left, JSON.stringify(bounds)).toBeGreaterThanOrEqual(-1)
            expect(bounds.right, JSON.stringify(bounds)).toBeLessThanOrEqual(1)
          }
          if (state === 'smtp-dialog') {
            await page.keyboard.press('Escape')
            await expect(page.getByRole('dialog')).toBeHidden()
            await expect(page.getByRole('button', { name: /obriši lozinku|clear password/i })).toBeFocused()
          }
        })
      }
    }
  }
}

test.afterEach(async ({}, info) => {
  if (info.title.startsWith('M2 settings populated') && info.status !== info.expectedStatus) {
    reportAdmin(info.title, info.errors.map(error => error.message || String(error)).join(' | ').slice(0, 2200))
  }
})

// M2: populated expense book and its editable estimated-date dialog; no writes.
for (const mode of ['light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const state of ['expense-book', 'expense-dialog'] as const) {
      for (const adjustment of ['320px', 'text-200', 'text-spacing'] as const) {
        test(`M2 finance populated ${mode} ${language} ${state} ${adjustment}`, async ({ page }) => {
          await page.setViewportSize(adjustment === '320px' ? { width: 320, height: 720 } : { width: 1280, height: 900 })
          await page.emulateMedia({ reducedMotion: 'reduce' })
          await configureAurumTheme(page, mode)
          await page.addInitScript(locale => localStorage.setItem('APP_LOCALE', locale), language)
          const field = { id: 'field-1', fieldName: 'Iznos test', fieldType: 'NUMBER', isRequired: true, sortOrder: 0, defaultValue: null }
          const category = { id: 'category-1', name: 'Test kategorija', isActive: true, isFixed: true, templateId: 'template-1', template: { id: 'template-1', name: 'Test', fields: [field], requiresAttachmentPerItem: false } }
          const expense = { id: 'expense-1', title: 'Test rashod', expenseDate: '2026-03-01T00:00:00.000Z', dateEstimated: true, totalAmount: 30, notes: 'M2 fixture notes', createdAt: '2026-03-02T00:00:00.000Z', category, fieldValues: [{ id: 'value-1', fieldId: 'field-1', value: '30' }], attachments: [] }
          const book = { id: 'book-1', year: 2026, month: 3, isClosed: false, openedAt: '2026-03-01T00:00:00Z', closedAt: null, expenses: [expense], totalExpenses: 30, lockEvents: [] }
          const mutations: string[] = []
          page.on('request', request => {
            if (/\/api\/(expenses|expense-books)(?:\/|\?|$)/.test(request.url()) && request.method() !== 'GET') mutations.push(request.method())
          })
          await page.route('**/api/expense-books', route => route.fulfill({ json: [book] }))
          await page.route('**/api/expense-books/book-1', route => route.fulfill({ json: book }))
          await page.route('**/api/expense-categories', route => route.fulfill({ json: [category] }))
          await page.goto('/admin/finance?tab=expense', { waitUntil: 'networkidle' })
          const url = new URL(page.url())
          expect(url.pathname).toBe('/admin/finance')
          expect(url.searchParams.get('tab')).toBe('expense')
          await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
          await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
          await expect(page.locator('html')).toHaveAttribute('lang', language)
          await page.getByRole('button', { name: /otvori knjigu.*2026|open book.*2026/i }).click()
          await expect(page.getByText(/procijenjeno|estimated/i)).toBeVisible()
          const trigger = page.getByRole('button', { name: /uredi rashod test rashod|edit expense test rashod/i })
          await expect(trigger).toBeVisible()
          if (state === 'expense-dialog') {
            await trigger.click()
            const dialog = page.getByRole('dialog')
            await expect(dialog).toBeVisible()
            await expect(dialog.getByLabel(/datum rashoda|expense date/i)).toHaveValue('2026-03-01')
          }
          const settled = await settleAnimations(page)
          expect(settled).not.toBeNull()
          expect(settled?.stillRunning).toBe(0)
          if (adjustment === '320px') {
            const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
            if (widths.scroll > widths.viewport + 1) {
              const outside = await page.evaluate(() => {
                const width = document.documentElement.clientWidth
                return Array.from(document.body.querySelectorAll('*')).map(el => {
                  const rect = el.getBoundingClientRect()
                  const style = getComputedStyle(el)
                  return { tag: el.tagName, id: el.id, cls: String(el.className).slice(0, 100), left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), display: style.display, overflow: style.overflowX, text: (el.textContent || '').trim().slice(0, 48) }
                }).filter(el => el.display !== 'none' && el.width > 0 && el.right > width + 1).slice(0, 18)
              })
              reportAdmin(`M2 finance ${mode} ${language} ${state} 320`, JSON.stringify({ ...widths, offenders: await page.evaluate(overflowingElements, 1), outside }))
            }
            expect(widths.viewport).toBe(320)
            expect(widths.scroll - widths.viewport).toBeLessThanOrEqual(1)
            if (state === 'expense-book') {
              const region = page.getByRole('region', { name: /stavke knjige rashoda|expense book entries/i })
              await expect(region).toHaveAttribute('tabindex', '0')
              await expect(region.locator('.sr-only').filter({ hasText: /nema priloga|no attachments/i })).toHaveCount(1)
              await region.focus()
              await expect(region).toBeFocused()
              await page.keyboard.press('ArrowRight')
              await expect.poll(() => region.evaluate(el => el.scrollLeft)).toBeGreaterThan(0)
            }
            if (state === 'expense-dialog') {
              const box = await page.getByRole('dialog').boundingBox()
              expect(box).not.toBeNull()
              expect(box!.x).toBeGreaterThanOrEqual(-1)
              expect(box!.x + box!.width).toBeLessThanOrEqual(321)
            }
          } else {
            const before = await page.evaluate(clippedSnapshot)
            if (adjustment === 'text-200') {
              const base = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
              await page.evaluate(size => { document.documentElement.style.fontSize = `${size * 2}px` }, base)
              await expect.poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))).toBeCloseTo(base * 2, 2)
            } else {
              await page.addStyleTag({ content: M2_TEXT_SPACING })
            }
            await settleAnimations(page)
            const after = await page.evaluate(clippedSnapshot)
            const newlyClipped = Object.keys(after).filter(key => !(key in before)).map(key => ({ element: key, ...after[key] }))
            if (newlyClipped.length) reportAdmin(`M2 finance ${mode} ${language} ${state} ${adjustment}`, JSON.stringify(newlyClipped.slice(0, 8)))
            expect(newlyClipped, `${state} ${mode} ${language} ${adjustment}: newly clipped elements`).toEqual([])
          }
          if (state === 'expense-dialog') {
            await page.keyboard.press('Escape')
            await expect(page.getByRole('dialog')).toBeHidden()
          }
          expect(mutations).toEqual([])
        })
      }
    }
  }
}

test.afterEach(async ({}, info) => {
  if (info.title.startsWith('M2 finance populated') && info.status !== info.expectedStatus) {
    reportAdmin(info.title, info.errors.map(error => error.message || String(error)).join(' | ').slice(0, 2000))
  }
})

// Populated content and nested destructive confirmations: no DELETE is sent.
for (const mode of ['light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const state of ['blog-comment', 'gallery-image', 'review'] as const) {
      for (const adjustment of ['320px', 'text-200', 'text-spacing'] as const) {
        test(`M2 admin content ${mode} ${language} ${state} ${adjustment}`, async ({ page }) => {
          await page.setViewportSize(adjustment === '320px' ? { width: 320, height: 720 } : { width: 1280, height: 900 })
          await page.emulateMedia({ reducedMotion: 'reduce' })
          await configureAurumTheme(page, mode)
          await page.addInitScript(locale => localStorage.setItem('APP_LOCALE', locale), language)
          const writes: string[] = []
          page.on('request', request => {
            if (/\/api\/(blog|gallery|reviews)(?:\/|\?|$)/.test(request.url()) && request.method() !== 'GET') writes.push(request.method())
          })
          await page.route('**/api/blog/admin', route => route.fulfill({ json: [o4Post] }))
          await page.route('**/api/blog/o4-post/comments/admin', route => route.fulfill({ json: [o4Comment] }))
          await page.route('**/api/gallery/categories', route => route.fulfill({ json: [o4Category] }))
          await page.route('**/api/gallery/categories/o4-category', route => route.fulfill({ json: { ...o4Category, images: [o4Image] } }))
          await page.route(/\/api\/reviews\/admin(?:\?.*)?$/, route => route.fulfill({ json: [{ id: 'o4-review', serviceRating: 5, stylistRating: null, comment: 'O4 recenzija', isApproved: true, createdAt: '2026-01-01T10:00:00Z' }] }))
          const path = state === 'blog-comment' ? '/admin/blog' : state === 'gallery-image' ? '/admin/gallery' : '/admin/reviews'
          await page.goto(path, { waitUntil: 'networkidle' })
          expect(new URL(page.url()).pathname).toBe(path)
          await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
          await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
          await expect(page.locator('html')).toHaveAttribute('lang', language)
          let trigger
          if (state === 'blog-comment') {
            await page.getByRole('button', { name: /^(komentari|comments)$/i }).first().click()
            const parent = page.getByRole('dialog', { name: /O4 članak/ })
            await expect(parent.getByText('O4 komentar')).toBeVisible()
            trigger = parent.getByRole('button', { name: /^(obriši|delete)$/i })
          } else if (state === 'gallery-image') {
            await page.getByRole('button', { name: /O4 kategorija/ }).click()
            await expect(page.getByText('O4 slika')).toBeVisible()
            trigger = page.getByRole('button', { name: /^(obriši|delete)$/i }).nth(1)
          } else {
            await page.getByRole('button', { name: /detalji recenzije|review details/i }).click()
            const parent = page.getByRole('dialog', { name: /detalji recenzije|review details/i })
            await expect(parent.getByText('O4 recenzija')).toBeVisible()
            trigger = parent.getByRole('button', { name: /^(obriši|delete)$/i })
          }
          await trigger.click()
          const dialog = page.getByRole('dialog', { name: /potvrdi brisanje|confirm deletion|potvrda|confirmation/i })
          await expect(dialog).toBeVisible()
          await expect(dialog).toContainText(state === 'blog-comment' ? /obrisati komentar|delete.*comment/i : state === 'gallery-image' ? /obrisati sliku|delete.*image/i : /obrisati recenziju|delete.*review/i)
          // Nested dialogs can start a new finite transition after the first snapshot.
          // Wait for an actually idle animation set; a timeout still fails the test.
          await expect.poll(async () => (await settleAnimations(page))?.stillRunning ?? -1, { timeout: 10_000 }).toBe(0)
          if (adjustment === '320px') {
            const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
            if (widths.scroll > widths.viewport + 1) reportAdmin(`M2 admin content ${mode} ${language} ${state}`, JSON.stringify({ ...widths, offenders: await page.evaluate(overflowingElements, 1) }))
            expect(widths.scroll - widths.viewport, JSON.stringify(widths)).toBeLessThanOrEqual(1)
            const box = await dialog.boundingBox()
            expect(box).not.toBeNull()
            expect(box!.x).toBeGreaterThanOrEqual(-1)
            expect(box!.x + box!.width).toBeLessThanOrEqual(321)
          } else {
            const before = await page.evaluate(clippedSnapshot)
            if (adjustment === 'text-200') {
              const base = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
              await page.evaluate(size => { document.documentElement.style.fontSize = `${size * 2}px` }, base)
              await expect.poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))).toBeCloseTo(base * 2, 2)
            } else await page.addStyleTag({ content: M2_TEXT_SPACING })
            await settleAnimations(page)
            const after = await page.evaluate(clippedSnapshot)
            const newlyClipped = Object.keys(after).filter(key => !(key in before)).map(key => ({ element: key, ...after[key] }))
            if (newlyClipped.length) reportAdmin(`M2 admin content ${mode} ${language} ${state} ${adjustment}`, JSON.stringify(newlyClipped.slice(0, 8)))
            expect(newlyClipped).toEqual([])
          }
          await page.keyboard.press('Escape')
          await expect(dialog).toBeHidden()
          await expect(trigger).toBeFocused()
          const readable = state === 'gallery-image'
            ? page.locator('[data-gallery-category-name], [data-gallery-image-meta] p')
            : state === 'review' ? page.locator('[data-review-comment]') : null
          if (readable) {
            for (const element of await readable.all()) {
              const metrics = await element.evaluate(el => ({ overflow: getComputedStyle(el).overflowX, whiteSpace: getComputedStyle(el).whiteSpace, width: el.clientWidth, scroll: el.scrollWidth }))
              expect(metrics.overflow, JSON.stringify(metrics)).toBe('visible')
              expect(metrics.whiteSpace).not.toBe('nowrap')
              expect(metrics.scroll - metrics.width, JSON.stringify(metrics)).toBeLessThanOrEqual(1)
            }
          }
          if (state === 'gallery-image') {
            const meta = page.locator('[data-gallery-image-meta]')
            const dimensions = await meta.evaluate(el => {
              const parent = el.parentElement!.parentElement!.getBoundingClientRect()
              return [...el.querySelectorAll('p, button')].map(child => {
                const rect = child.getBoundingClientRect()
                return { left: rect.left - parent.left, right: rect.right - parent.right }
              })
            })
            for (const bounds of dimensions) {
              expect(bounds.left, JSON.stringify(dimensions)).toBeGreaterThanOrEqual(-1)
              expect(bounds.right, JSON.stringify(dimensions)).toBeLessThanOrEqual(1)
            }
          }
          expect(writes).toEqual([])
        })
      }
    }
  }
}

test.afterEach(async ({}, info) => {
  if (info.title.startsWith('M2 admin content') && info.status !== info.expectedStatus) reportAdmin(info.title, info.errors.map(error => error.message || String(error)).join(' | ').slice(0, 2000))
})

// Populated debtor list, including a server-side search, at the Finance deep link.
for (const mode of ['light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const state of ['list', 'search'] as const) {
      for (const adjustment of ['320px', 'text-200', 'text-spacing'] as const) {
        test(`M2 admin debts ${mode} ${language} ${state} ${adjustment}`, async ({ page }) => {
          await page.setViewportSize(adjustment === '320px' ? { width: 320, height: 720 } : { width: 1280, height: 900 })
          await page.emulateMedia({ reducedMotion: 'reduce' })
          await configureAurumTheme(page, mode)
          await page.addInitScript(locale => localStorage.setItem('APP_LOCALE', locale), language)
          const debt = { id: 'debt-1', amount: 125.5, createdAt: '2026-01-02T10:00:00Z', status: 'OPEN', client: { id: 'c1', username: 'amela', firstName: 'Amela', lastName: 'Dugoprezime-Testiranje' }, stylistProfile: { id: 's1', user: { username: 'ana', firstName: 'Ana', lastName: 'Test' } }, service: { id: 's', name: 'Svečana frizura i njega kose' }, reservation: { id: 'r', publicReferenceCode: 'M2-DEBT-001', reservationDate: '2026-01-02', startTime: '10:00', endTime: '11:00' } }
          const other = { ...debt, id: 'debt-2', amount: 10, client: { id: 'c2', username: 'drugi', firstName: 'Drugi', lastName: 'Klijent' }, reservation: null }
          const queries: string[] = []
          await page.route('**/api/client-debts/all?**', route => {
            const params = new URL(route.request().url()).searchParams
            expect(params.get('status')).toBe('OPEN')
            const q = params.get('q') || ''
            queries.push(q)
            const items = q ? [debt] : [debt, other]
            return route.fulfill({ json: { items, total: items.length, totalAmount: q ? 125.5 : 135.5, page: 0, pageSize: 20 } })
          })
          await page.goto('/admin/finance?tab=debtors', { waitUntil: 'networkidle' })
          expect(new URL(page.url()).searchParams.get('tab')).toBe('debtors')
          await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
          await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
          await expect(page.locator('html')).toHaveAttribute('lang', language)
          const root = page.locator('[data-debt-list]')
          await expect(root).toContainText('M2-DEBT-001')
          await expect(root.getByText('Amela Dugoprezime-Testiranje')).toBeVisible()
          if (state === 'search') {
            await root.locator('#q').fill('Amela')
            await expect.poll(() => queries.includes('Amela')).toBe(true)
            await expect(root.getByText('Drugi Klijent')).toHaveCount(0)
            await expect(root).toContainText(/125[,.]50/)
          } else await expect(root.getByText('Drugi Klijent')).toBeVisible()
          await expect.poll(async () => (await settleAnimations(page))?.stillRunning ?? -1, { timeout: 10_000 }).toBe(0)
          if (adjustment === '320px') {
            const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
            if (widths.scroll > widths.viewport + 1) reportAdmin(`M2 admin debts ${mode} ${language} ${state}`, JSON.stringify({ ...widths, offenders: await page.evaluate(overflowingElements, 1) }))
            expect(widths.scroll - widths.viewport, JSON.stringify(widths)).toBeLessThanOrEqual(1)
          } else {
            const before = await page.evaluate(clippedSnapshot)
            if (adjustment === 'text-200') {
              const base = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
              await page.evaluate(size => { document.documentElement.style.fontSize = `${size * 2}px` }, base)
              await expect.poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))).toBeCloseTo(base * 2, 2)
            } else await page.addStyleTag({ content: M2_TEXT_SPACING })
            await settleAnimations(page)
            const after = await page.evaluate(clippedSnapshot)
            const lost = Object.keys(after).filter(key => !(key in before)).map(key => ({ element: key, ...after[key] }))
            if (lost.length) reportAdmin(`M2 admin debts ${mode} ${language} ${state} ${adjustment}`, JSON.stringify(lost.slice(0, 8)))
            expect(lost).toEqual([])
          }
          const metrics = await root.locator('[data-debt-client]').first().evaluate(el => ({ overflow: getComputedStyle(el).overflowX, width: el.clientWidth, scroll: el.scrollWidth }))
          expect(metrics.overflow).toBe('visible')
          expect(metrics.scroll - metrics.width, JSON.stringify(metrics)).toBeLessThanOrEqual(1)
        })
      }
    }
  }
}

test.afterEach(async ({}, info) => {
  if (info.title.startsWith('M2 admin debts') && info.status !== info.expectedStatus) reportAdmin(info.title, info.errors.map(error => error.message || String(error)).join(' | ').slice(0, 2000))
})

// Income book with automatic and manual entries; edit dialog is cancelled without writes.
for (const mode of ['light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const state of ['book', 'edit'] as const) {
      for (const adjustment of ['320px', 'text-200', 'text-spacing'] as const) {
        test(`M2 income book ${mode} ${language} ${state} ${adjustment}`, async ({ page }) => {
          await page.setViewportSize(adjustment === '320px' ? { width: 320, height: 720 } : { width: 1280, height: 900 })
          await page.emulateMedia({ reducedMotion: 'reduce' })
          await configureAurumTheme(page, mode)
          await page.addInitScript(locale => localStorage.setItem('APP_LOCALE', locale), language)
          const service = { id: 'service-income', name: 'Svečana frizura i njega kose', price: 50 }
          const stylist = { id: 'stylist-income', user: { username: 'ana', firstName: 'Ana', lastName: 'Test' } }
          const manual = { id: 'income-manual', date: '2026-03-02T00:00:00Z', serviceId: service.id, stylistProfileId: stylist.id, clientId: null, amount: 50, tipAmount: 5, notes: 'M2 income note', createdAt: '2026-03-02T00:00:00Z', updatedAt: '2026-03-02T00:00:00Z', service, stylistProfile: stylist }
          const auto = { id: 'income-auto', amount: 25, tipAmount: 0, date: '2026-03-01', dailyLogEntryId: 'daily-1', dailyLogEntry: { id: 'daily-1', date: '2026-03-01', actualPrice: 25, tipAmount: 0, notes: null, status: 'COMPLETED', isManual: false, service: { name: 'Pranje kose' }, stylistProfile: stylist } }
          const book = { id: 'income-book-1', year: 2026, month: 3, totalRevenue: 75, totalTips: 5, openedAt: '2026-03-01T00:00:00Z', closedAt: null, entries: [auto], manualEntries: [manual], lockEvents: [], manualAudits: [] }
          const mutations: string[] = []
          page.on('request', request => { if (/\/api\/income-books(?:\/|\?|$)/.test(request.url()) && request.method() !== 'GET') mutations.push(request.method()) })
          await page.route('**/api/income-books**', route => route.request().method() === 'GET' ? route.fallback() : route.abort())
          await page.route('**/api/income-books', route => route.request().method() === 'GET' ? route.fulfill({ json: [book] }) : route.abort())
          await page.route('**/api/income-books/income-book-1', route => route.request().method() === 'GET' ? route.fulfill({ json: book }) : route.abort())
          await page.route('**/api/income-books/income-book-1/integrity', route => route.fulfill({ json: { bookId: book.id, isLocked: false, missingCount: 0, orphanedCount: 0, isHealthy: true, missing: [], orphaned: [] } }))
          await page.route('**/api/stylists/admin?**', route => route.fulfill({ json: [stylist] }))
          await page.route('**/api/stylists/admin/stylist-income/services?**', route => route.fulfill({ json: [{ service }] }))
          await page.goto('/admin/finance?tab=income', { waitUntil: 'networkidle' })
          expect(new URL(page.url()).pathname).toBe('/admin/finance')
          expect(new URL(page.url()).searchParams.get('tab')).toBe('income')
          await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
          await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
          await expect(page.locator('html')).toHaveAttribute('lang', language)
          await page.getByRole('button', { name: /otvori knjigu.*2026|open book.*2026/i }).click()
          const table = page.getByRole('table', { name: /stavke knjige prihoda|income book entries/i })
          await expect(table).toContainText('Svečana frizura i njega kose')
          await expect(table).toContainText('Pranje kose')
          const trigger = table.getByRole('button', { name: /uredi ručni prihod|edit manual income entry/i })
          await expect(trigger).toBeVisible()
          const dialog = page.getByRole('dialog')
          if (state === 'edit') {
            await trigger.click()
            await expect(dialog).toBeVisible()
            await expect(dialog.locator('#manual-date')).toHaveValue('2026-03-02')
            await expect(dialog.locator('#manual-notes')).toHaveValue('M2 income note')
          }
          await expect.poll(async () => (await settleAnimations(page))?.stillRunning ?? -1, { timeout: 10_000 }).toBe(0)
          if (adjustment === '320px') {
            const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth, outside: Array.from(document.body.querySelectorAll('*')).map(el => { const r = el.getBoundingClientRect(); return { tag: el.tagName, cls: String(el.className).slice(0, 90), right: Math.round(r.right), text: (el.textContent || '').trim().slice(0, 35) } }).filter(x => x.right > document.documentElement.clientWidth + 1).slice(0, 15) }))
            if (widths.scroll > widths.viewport + 1) reportAdmin(`M2 income book ${mode} ${language} ${state}`, JSON.stringify(widths))
            expect(widths.scroll - widths.viewport, JSON.stringify(widths)).toBeLessThanOrEqual(1)
            if (state === 'edit') {
              const box = await dialog.boundingBox()
              expect(box).not.toBeNull()
              expect(box!.x).toBeGreaterThanOrEqual(-1)
              expect(box!.x + box!.width).toBeLessThanOrEqual(321)
            }
          } else {
            const before = await page.evaluate(clippedSnapshot)
            if (adjustment === 'text-200') {
              const base = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
              await page.evaluate(size => { document.documentElement.style.fontSize = `${size * 2}px` }, base)
              await expect.poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))).toBeCloseTo(base * 2, 2)
            } else await page.addStyleTag({ content: M2_TEXT_SPACING })
            await settleAnimations(page)
            const after = await page.evaluate(clippedSnapshot)
            const lost = Object.keys(after).filter(key => !(key in before)).map(key => ({ element: key, ...after[key] }))
            if (lost.length) reportAdmin(`M2 income book ${mode} ${language} ${state} ${adjustment}`, JSON.stringify(lost.slice(0, 8)))
            expect(lost).toEqual([])
          }
          if (state === 'edit') {
            await page.keyboard.press('Escape')
            await expect(dialog).toBeHidden()
          }
          expect(mutations).toEqual([])
        })
      }
    }
  }
}

test.afterEach(async ({}, info) => {
  if (info.title.startsWith('M2 income book') && info.status !== info.expectedStatus) reportAdmin(info.title, info.errors.map(error => error.message || String(error)).join(' | ').slice(0, 2000))
})
