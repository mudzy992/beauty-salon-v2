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
      await page.route('**/api/users/fixture-user/stylist-removal-preview', route => route.fulfill({ json: { stylistProfileId: 'stylist-one', counts: { dailyLogEntriesCount: 2, confirmedReservationsCount: 1, reservationResponsesCount: 0, reviewsCount: 0 } } }))
      await page.route('**/api/stylists/admin**', route => route.fulfill({ json: [{ id: 'stylist-two', user: { username: 'drugi' }, status: 'ACTIVE' }] }))
      await page.goto('/admin/users', { waitUntil: 'networkidle' })
      const root = page.locator('[data-admin-users]')
      await expect(root.locator('p:visible, span:visible').filter({ hasText: 'test.stilist' }).first()).toBeVisible()
      const edit = viewport === 'desktop' ? root.getByRole('button', { name: /uredi korisnika test.stilist|edit user test.stilist/i }) : root.getByRole('button', { name: /^(uredi|edit)$/i })
      await edit.click()
      const dialog = page.locator('[data-users-dialog][role="dialog"]')
      await expect(dialog.getByRole('switch')).toHaveAccessibleName(/aktivan|active/i)
      await expect(dialog.locator('#users-gender')).toHaveAttribute('aria-required', 'true')
      const editAxe = await new AxeBuilder({ page }).include('[data-users-dialog]').withTags(AXE_RULE_TAGS).analyze()
      console.log(`USERS_EDIT_${mode}_${viewport} ${JSON.stringify({ violations: editAxe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: editAxe.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) })}`)
      expect(assertableViolations(editAxe.violations)).toEqual([])
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      await root.getByRole('button', { name: /ukloni ulogu.*stilist|remove.*stylist/i }).first().click()
      await expect(dialog).toBeVisible()
      const selects = dialog.locator('select[id^="users-stylist-removal-target-"]')
      await expect(selects).toHaveCount(2)
      const labels = await selects.evaluateAll(elements => elements.map(el => ({ id: el.id, labels: (el as HTMLSelectElement).labels?.length ?? 0 })))
      expect(new Set(labels.map(item => item.id)).size).toBe(2)
      expect(labels.map(item => item.labels)).toEqual([1, 1])
      await selects.nth(0).selectOption('stylist-two')
      await selects.nth(1).selectOption('stylist-two')
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
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
  await page.route('**/api/users/fixture-user/stylist-removal-preview', route => route.fulfill({ json: { stylistProfileId: 'stylist-one', counts: { dailyLogEntriesCount: 0, confirmedReservationsCount: 0, reservationResponsesCount: 0, reviewsCount: 0 } } }))
  let removals = 0
  await page.route('**/api/users/fixture-user/remove-stylist-role', route => { removals += 1; return route.fulfill({ json: { ok: true } }) })
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
