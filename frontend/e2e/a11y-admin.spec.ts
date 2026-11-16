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

import {
  activeElementIsSegmentedInput,
  activeElementLabel,
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
    page.once('dialog', dialog => dialog.dismiss())
    await action.click()
    expect(requests).toBe(0)
    page.once('dialog', dialog => dialog.accept())
    await action.click()
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
  page.once('dialog', dialog => dialog.dismiss())
  await remove.click()
  expect(removals).toBe(0)
  page.once('dialog', dialog => dialog.accept())
  await remove.click()
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
  page.once('dialog', dialog => dialog.dismiss())
  await send.click()
  expect(requests).toBe(0)
  page.once('dialog', dialog => dialog.accept())
  await send.click()
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
