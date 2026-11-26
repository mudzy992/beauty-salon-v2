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
  clippedSnapshot,
  overflowingElements,
  focusableSnapshot,
  describeImageInventory,
  imageBearingInventory,
  inlineColorContrastViolations,
  labelInNameViolations,
  probeFocusability,
} from './dom-metrics.mjs'
import { analyzeTabTraversal, describeTraversal, tabPressesFor } from './tab-traversal.mjs'
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

/** Glasan nalaz: test koji pada mora sam imenovati šta pada. */
function reportStylist(title: string, detail: string): void {
  const encoded = detail.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
  process.stdout.write(`::error title=${title}::${encoded}\n`)
}

// ── 2.1.1 / 2.1.2 / 2.4.3 — stvarni Tab-prolazak kroz stylist ─────────────────
//
// Javne rute ovo mjere u `wcag-rendered.spec.ts`; stylist dosad NIJE bio pokriven, pa su
// 2.1.1 i 2.4.3 stajali na 🟡 upravo zbog toga. Bilježi se NIZ fokusiranih elemenata, ne
// skup: skup dokazuje dostižnost (2.1.1) a baca redoslijed, koji traži 2.4.3.
//
// Indikator fokusa se ovdje NAMJERNO ne provjerava po elementu (2.4.7 je dokazan nad
// izvorom, `focus-visible` ×162) — time je jedan round-trip po pritisku manje na stranicama
// koje imaju i po stotinjak fokusabilnih elemenata.
for (const route of STYLIST_ROUTES) {
  test(`2.1.1/2.4.3 stylist: Tab-prolazak — ${route.name} (${route.path})`, async ({ page }) => {
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
      reportStylist(
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
      reportStylist(`2.1.2 ${route.path} — fokus zaglavljen`, describeTraversal(traversal))
    }
    expect(traversal.stuckAt, `${route.path}: fokus zaglavljen na "${traversal.stuckAt}"`).toBe(null)

    // 2.4.3: redoslijed fokusa prati DOM redoslijed. Pozitivni `tabindex` i vizuelno
    // preslagivanje bez preslagivanja DOM-a isplivaju upravo ovdje.
    if (traversal.orderMismatch) {
      reportStylist(`2.4.3 ${route.path} — redoslijed fokusa`, describeTraversal(traversal))
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
for (const route of STYLIST_ROUTES) {
  test(`1.4.5 stylist: popis mjesta gdje tekst može biti slika — ${route.name} (${route.path})`, async ({ page }) => {
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

// ── 2.5.3 Label in Name — postojeća mjera proširena na stylist rute ─────────
//
// `labelInNameViolations()` je dosad bila vezana samo na 9 javnih i 15 admin ruta, iako
// stylist shell ima isti obrazac menija s inicijalima. Axe ovo pravilo vraća kao
// **incomplete** (nesigurnost, ne nalaz), pa se mjeri direktno: `aria-label` se upoređuje
// s `innerText` u stvarnom rasporedu.
for (const route of STYLIST_ROUTES) {
  test(`2.5.3 stylist: ime sadrži vidljivi tekst — ${route.name} (${route.path})`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'networkidle' })

    const bad = await page.evaluate(labelInNameViolations)
    if (bad.length) {
      process.stdout.write(
        `::error title=2.5.3 ${route.path} — ime ne sadrži vidljivi tekst::` +
          `${bad
            .slice(0, 4)
            .map((b) => `${b.element}: „${b.visible}“ nije u „${b.name}“`)
            .join(' | ')}\n`,
      )
    }
    expect(bad, `${route.path}: pristupačno ime ne sadrži vidljivi tekst`).toEqual([])
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
for (const route of STYLIST_ROUTES) {
  test(`1.4.3 stylist: inline boja teksta ima dovoljan kontrast — ${route.name} (${route.path})`, async ({ page }) => {
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

for (const mode of ['light', 'dark'] as const) {
  for (const path of ['/stylist/inbox', '/stylist/schedule']) {
    test(`Aurum ${mode} stylist rendered axe: ${path}`, async ({ page }) => {
      await page.addInitScript((selectedMode) => {
        localStorage.removeItem('nejra.theme')
        localStorage.setItem('nejra.theme.mode', selectedMode)
      }, mode)
      await page.route('**/api/settings/public', async (route) => {
        const response = await route.fetch()
        if (!response.ok()) throw new Error(`Public settings failed: ${response.status()}`)
        const rows = await response.json() as Array<{ key: string; value: string }>
        await route.fulfill({ response, json: [
          ...rows.filter((row) => row.key !== 'theme_default_mode'),
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

// M2: osam stvarnih odredišta iz inventara (profil je namjerni redirect).
// 320 CSS px i uvećanje rem-a nisu stvarni browser zoom, niti mjere sva stanja.
const STYLIST_TEXT_SPACING = `
  *, *::before, *::after {
    line-height: 1.5 !important;
    letter-spacing: 0.12em !important;
    word-spacing: 0.16em !important;
  }
  p { margin-bottom: 2em !important; }
`
for (const mode of ['light', 'dark'] as const) {
  for (const route of STYLIST_ROUTES) {
    for (const adjustment of ['320px', 'text-200', 'text-spacing'] as const) {
      test(`M2 stylist ${mode} ${adjustment}: ${route.path}`, async ({ page }) => {
        await page.setViewportSize(adjustment === '320px' ? { width: 320, height: 720 } : { width: 1280, height: 900 })
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.addInitScript(selectedMode => {
          localStorage.removeItem('nejra.theme')
          localStorage.setItem('nejra.theme.mode', selectedMode)
        }, mode)
        await page.route('**/api/settings/public', async intercepted => {
          const response = await intercepted.fetch()
          if (!response.ok()) throw new Error(`Public settings failed: ${response.status()}`)
          const rows = await response.json() as Array<{ key: string; value: string }>
          await intercepted.fulfill({ response, json: [
            ...rows.filter(row => row.key !== 'theme_default_mode'),
            { key: 'theme_default_mode', value: mode },
          ] })
        })
        await page.goto(route.path, { waitUntil: 'networkidle' })
        expect(new URL(page.url()).pathname).toBe(route.expectPrefix ?? route.path)
        await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
        await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
        const settled = await settleAnimations(page)
        expect(settled).not.toBeNull()
        expect(settled?.stillRunning).toBe(0)
        if (adjustment === '320px') {
          const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
          expect(widths.viewport).toBe(320)
          if (widths.scroll > widths.viewport + 1) reportStylist(`M2 stylist ${mode} 320 ${route.path}`, JSON.stringify({ ...widths, offenders: await page.evaluate(overflowingElements, 1) }))
          expect(widths.scroll - widths.viewport, JSON.stringify(widths)).toBeLessThanOrEqual(1)
          if (route.path === '/stylist/schedule') {
            const heading = page.locator('[data-stylist-schedule-heading]')
            await expect(heading.getByRole('heading', { name: /raspored|schedule/i })).toBeVisible()
            for (const [role, action] of [['button', /osvježi|refresh/i], ['link', /direktna rezervacija|direct booking/i]] as const) {
              const control = heading.getByRole(role, { name: action })
              await expect(control).toBeVisible()
              const bounds = await control.boundingBox()
              expect(bounds).not.toBeNull()
              expect(bounds!.x).toBeGreaterThanOrEqual(0)
              expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(321)
            }
          }
        } else {
          const before = await page.evaluate(clippedSnapshot)
          if (adjustment === 'text-200') {
            const base = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
            await page.evaluate(size => { document.documentElement.style.fontSize = `${size * 2}px` }, base)
            await expect.poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))).toBeCloseTo(base * 2, 2)
          } else {
            await page.addStyleTag({ content: STYLIST_TEXT_SPACING })
          }
          await settleAnimations(page)
          const after = await page.evaluate(clippedSnapshot)
          const newlyClipped = Object.keys(after).filter(key => !(key in before)).map(key => ({ element: key, ...after[key] }))
          if (newlyClipped.length) reportStylist(`M2 stylist ${mode} ${adjustment} ${route.path}`, JSON.stringify(newlyClipped.slice(0, 8)))
          expect(newlyClipped, `${route.path} ${mode} ${adjustment}: newly clipped elements`).toEqual([])
        }
      })
    }
  }
}

// M2 sljedeći segment: jedan popunjeni unos radne knjige, njegov detalj i otvoreni drawer.
// Testni podaci su izolovani; ne šalju se mutacije niti se tvrdi pokrivenost drugih stanja.
for (const mode of ['light', 'dark'] as const) {
  for (const state of ['list', 'detail', 'drawer'] as const) {
    for (const adjustment of ['320px', 'text-200', 'text-spacing'] as const) {
      test(`M2 stylist workbook ${mode} ${state} ${adjustment}`, async ({ page }) => {
        await page.setViewportSize(adjustment === '320px' ? { width: 320, height: 720 } : { width: 1280, height: 900 })
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.addInitScript(selectedMode => {
          localStorage.removeItem('nejra.theme')
          localStorage.setItem('nejra.theme.mode', selectedMode)
        }, mode)
        await page.route('**/api/settings/public', async intercepted => {
          const response = await intercepted.fetch()
          if (!response.ok()) throw new Error(`Public settings failed: ${response.status()}`)
          const rows = await response.json() as Array<{ key: string; value: string }>
          await intercepted.fulfill({ response, json: [
            ...rows.filter(row => row.key !== 'theme_default_mode'),
            { key: 'theme_default_mode', value: mode },
          ] })
        })
        const entry = {
          id: 'entry-test', publicReferenceCode: 'DK-TEST', stylistProfileId: 'stylist-profile',
          date: '2026-01-01', status: 'COMPLETED', images: [], isManual: true,
          serviceId: 'service-test', service: { id: 'service-test', name: 'Svečana frizura i njega kose' },
          client: { id: 'client-test', firstName: 'Test', lastName: 'Klijent' },
          actualPrice: 45, tipAmount: 5, notes: 'Primjer bilješke o tretmanu.',
        }
        await page.route('**/api/stylists/me', route => route.fulfill({ json: { id: 'stylist-profile' } }))
        await page.route('**/api/daily-log?**', route => route.fulfill({ json: [entry] }))
        await page.route('**/api/daily-log/entry-test', route => route.fulfill({ json: entry }))
        await page.route('**/api/users/for-daily-log**', route => route.fulfill({ json: [] }))
        await page.route('**/api/services?**', route => route.fulfill({ json: [] }))
        const path = state === 'detail' ? '/stylist/workbook/entry-test' : '/stylist/workbook'
        await page.goto(path, { waitUntil: 'networkidle' })
        expect(new URL(page.url()).pathname).toBe(path)
        await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
        await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
        if (state === 'detail') {
          await expect(page.getByRole('heading', { name: 'DK-TEST' })).toBeVisible()
          await expect(page.getByText('Svečana frizura i njega kose')).toBeVisible()
        } else {
          await expect(page.locator('a[href="/stylist/workbook/entry-test"]')).toContainText('DK-TEST')
          if (state === 'drawer') {
            await page.getByRole('button', { name: /Novi unos|New entry/i }).first().click()
            const drawer = page.locator('[data-aurum-overlay-surface][role="dialog"]')
            await expect(drawer).toBeVisible()
            await expect(drawer.getByLabel(/Klijent|Client/i, { exact: true })).toBeVisible()
          }
        }
        const settled = await settleAnimations(page)
        expect(settled).not.toBeNull()
        expect(settled?.stillRunning).toBe(0)
        if (adjustment === '320px') {
          const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
          if (widths.scroll > widths.viewport + 1) reportStylist(`M2 workbook ${mode} ${state} 320`, JSON.stringify({ ...widths, offenders: await page.evaluate(overflowingElements, 1) }))
          expect(widths.viewport).toBe(320)
          expect(widths.scroll - widths.viewport).toBeLessThanOrEqual(1)
          if (state === 'drawer') {
            const box = await page.locator('[data-aurum-overlay-surface][role="dialog"]').boundingBox()
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
            await page.addStyleTag({ content: STYLIST_TEXT_SPACING })
          }
          await settleAnimations(page)
          const after = await page.evaluate(clippedSnapshot)
          const lost = Object.keys(after).filter(key => !(key in before)).map(key => ({ element: key, ...after[key] }))
          if (lost.length) reportStylist(`M2 workbook ${mode} ${state} ${adjustment}`, JSON.stringify(lost.slice(0, 8)))
          expect(lost, `${state} ${mode} ${adjustment}: newly clipped elements`).toEqual([])
        }
      })
    }
  }
}

test.afterEach(async ({}, info) => {
  if (info.title.startsWith('M2 stylist workbook') && info.status !== info.expectedStatus) {
    reportStylist(`M2 workbook failure ${info.title}`, info.errors.map(error => error.message || String(error)).join(' | ').slice(0, 2000))
  }
})

// M2: populated schedule, reservation detail and cancellation dialog (read-only fixture).
for (const mode of ['light', 'dark'] as const) {
  for (const state of ['schedule', 'detail', 'cancel-dialog'] as const) {
    for (const adjustment of ['320px', 'text-200', 'text-spacing'] as const) {
      test(`M2 stylist reservation ${mode} ${state} ${adjustment}`, async ({ page }) => {
        await page.setViewportSize(adjustment === '320px' ? { width: 320, height: 720 } : { width: 1280, height: 900 })
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.addInitScript(selectedMode => {
          localStorage.removeItem('nejra.theme')
          localStorage.setItem('nejra.theme.mode', selectedMode)
        }, mode)
        await page.route('**/api/settings/public', async intercepted => {
          const response = await intercepted.fetch()
          if (!response.ok()) throw new Error(`Public settings failed: ${response.status()}`)
          const rows = await response.json() as Array<{ key: string; value: string }>
          await intercepted.fulfill({ response, json: [
            ...rows.filter(row => row.key !== 'theme_default_mode'),
            { key: 'theme_default_mode', value: mode },
          ] })
        })
        const reservation = {
          id: 'reservation-test', clientId: 'client-test', serviceId: 'service-test',
          reservationDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          startTime: '12:00', endTime: '13:00', status: 'CONFIRMED',
          confirmedStylistId: 'stylist-profile', clientNotes: 'Primjer napomene za tretman.',
          service: { id: 'service-test', name: 'Svečana frizura i njega kose', durationMinutes: 60, price: 45 },
          client: { id: 'client-test', firstName: 'Test', lastName: 'Klijent' },
        }
        const mutations: string[] = []
        page.on('request', request => {
          if (/\/api\/reservations(?:\/|\?|$)/.test(request.url()) && request.method() !== 'GET') mutations.push(request.method())
        })
        await page.route('**/api/stylists/me', route => route.fulfill({ json: { id: 'stylist-profile' } }))
        await page.route('**/api/reservations?**', route => route.fulfill({ json: [reservation] }))
        await page.route('**/api/reservations/reservation-test', route => route.fulfill({ json: reservation }))
        await page.route('**/api/client-debts?**', route => route.fulfill({ json: [] }))
        const path = state === 'schedule' ? '/stylist/schedule' : '/stylist/schedule/reservation-test'
        await page.goto(path, { waitUntil: 'networkidle' })
        expect(new URL(page.url()).pathname).toBe(path)
        await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
        await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
        if (state === 'schedule') {
          await expect(page.locator('a[href="/stylist/schedule/reservation-test"]').first()).toContainText('Svečana frizura')
        } else {
          await expect(page.getByText('Primjer napomene za tretman.')).toBeVisible()
          const trigger = page.getByRole('button', { name: /otkazivanje \(uz razlog\)|cancel.*reason/i })
          await expect(trigger).toBeVisible()
          if (state === 'cancel-dialog') {
            await trigger.click()
            const dialog = page.getByRole('dialog')
            await expect(dialog).toBeVisible()
            await expect(dialog.locator('#cancelReason')).toBeVisible()
          }
        }
        const settled = await settleAnimations(page)
        expect(settled).not.toBeNull()
        expect(settled?.stillRunning).toBe(0)
        if (adjustment === '320px') {
          const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
          if (widths.scroll > widths.viewport + 1) reportStylist(`M2 reservation ${mode} ${state} 320`, JSON.stringify({ ...widths, offenders: await page.evaluate(overflowingElements, 1) }))
          expect(widths.viewport).toBe(320)
          expect(widths.scroll - widths.viewport).toBeLessThanOrEqual(1)
          if (state === 'cancel-dialog') {
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
            await page.addStyleTag({ content: STYLIST_TEXT_SPACING })
          }
          await settleAnimations(page)
          const after = await page.evaluate(clippedSnapshot)
          const lost = Object.keys(after).filter(key => !(key in before)).map(key => ({ element: key, ...after[key] }))
          if (lost.length) reportStylist(`M2 reservation ${mode} ${state} ${adjustment}`, JSON.stringify(lost.slice(0, 8)))
          expect(lost, `${state} ${mode} ${adjustment}: newly clipped elements`).toEqual([])
        }
        if (state !== 'cancel-dialog') {
          const serviceName = page.locator(state === 'schedule' ? '[data-stylist-schedule-card] .truncate' : '[data-stylist-detail-summary] .truncate')
          await expect(serviceName).toHaveText('Svečana frizura i njega kose')
          const textGeometry = await serviceName.evaluate(el => ({ overflow: getComputedStyle(el).overflowX, width: el.clientWidth, scroll: el.scrollWidth }))
          expect(textGeometry.overflow).not.toBe('hidden')
          expect(textGeometry.scroll - textGeometry.width).toBeLessThanOrEqual(1)
        }
        if (state === 'cancel-dialog') {
          await page.keyboard.press('Escape')
          await expect(page.getByRole('dialog')).toBeHidden()
        }
        expect(mutations).toEqual([])
      })
    }
  }
}

test.afterEach(async ({}, info) => {
  if (info.title.startsWith('M2 stylist reservation') && info.status !== info.expectedStatus) {
    reportStylist(`M2 reservation failure ${info.title}`, info.errors.map(error => error.message || String(error)).join(' | ').slice(0, 2000))
  }
})

// M2: inbox rejection, no-show and rescheduling dialogs with read-only fixtures.
for (const mode of ['light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const state of ['inbox-reject', 'no-show', 'reorder'] as const) {
      for (const adjustment of ['320px', 'text-200', 'text-spacing'] as const) {
        test(`M2 stylist dialogs ${mode} ${language} ${state} ${adjustment}`, async ({ page }) => {
          await page.setViewportSize(adjustment === '320px' ? { width: 320, height: 720 } : { width: 1280, height: 900 })
          await page.emulateMedia({ reducedMotion: 'reduce' })
          await page.addInitScript(({ selectedMode, locale }) => {
            localStorage.removeItem('nejra.theme')
            localStorage.setItem('nejra.theme.mode', selectedMode)
            localStorage.setItem('APP_LOCALE', locale)
          }, { selectedMode: mode, locale: language })
          await page.route('**/api/settings/public', async intercepted => {
            const response = await intercepted.fetch()
            if (!response.ok()) throw new Error(`Public settings failed: ${response.status()}`)
            const rows = await response.json() as Array<{ key: string; value: string }>
            await intercepted.fulfill({ response, json: [
              ...rows.filter(row => row.key !== 'theme_default_mode'),
              { key: 'theme_default_mode', value: mode },
            ] })
          })
          const name = 'Svečana frizura i posebna njega za dugu kosu'
          const reservation = {
            id: 'm2-stylist', clientId: 'client-test', serviceId: 'service-test',
            reservationDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
            startTime: '12:00', endTime: '13:00', status: state === 'inbox-reject' ? 'STYLIST_REVIEW' : 'CONFIRMED',
            confirmedStylistId: 'stylist-profile', clientNotes: 'M2 stylist notes',
            service: { id: 'service-test', name, durationMinutes: 60, price: 45 },
            client: { id: 'client-test', firstName: 'Test', lastName: 'Klijent' },
            stylistResponses: [{ stylistProfileId: 'stylist-profile', status: 'LOCKED', lockExpiresAt: null, hasLockedOnce: true }],
          }
          const mutations: string[] = []
          page.on('request', request => {
            if (/\/api\/reservations(?:\/|\?|$)/.test(request.url()) && request.method() !== 'GET') mutations.push(request.method())
          })
          await page.route('**/api/stylists/me', route => route.fulfill({ json: { id: 'stylist-profile' } }))
          await page.route('**/api/reservations?**', route => route.fulfill({ json: [reservation] }))
          await page.route('**/api/reservations/m2-stylist', route => route.fulfill({ json: reservation }))
          await page.route('**/api/client-debts?**', route => route.fulfill({ json: [] }))
          const path = state === 'inbox-reject' ? '/stylist/inbox' : '/stylist/schedule/m2-stylist'
          await page.goto(path, { waitUntil: 'networkidle' })
          expect(new URL(page.url()).pathname).toBe(path)
          await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
          await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
          await expect(page.locator('html')).toHaveAttribute('lang', language)
          const trigger = page.getByRole('button', { name: state === 'inbox-reject' ? /^(odbij|reject)$/i : state === 'no-show' ? /no-show/i : /reorder/i })
          await expect(trigger).toBeVisible()
          await trigger.click()
          const dialog = page.getByRole('dialog')
          await expect(dialog).toBeVisible()
          if (state === 'inbox-reject') {
            await expect(dialog.locator('#rejectionReason')).toBeVisible()
            await dialog.locator('#rejectionReason').fill('M2 reason')
          } else if (state === 'no-show') {
            await expect(dialog.locator('#noShowReason')).toBeVisible()
            await dialog.locator('#noShowReason').fill('M2 reason')
          } else {
            await expect(dialog.locator('#reorderStart')).toHaveValue('12:00')
            await expect(dialog.locator('#reorderEnd')).toHaveValue('13:00')
          }
          const settled = await settleAnimations(page)
          expect(settled).not.toBeNull()
          expect(settled?.stillRunning).toBe(0)
          if (adjustment === '320px') {
            const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
            if (widths.scroll > widths.viewport + 1) reportStylist(`M2 stylist dialogs ${mode} ${language} ${state} 320`, JSON.stringify({ ...widths, offenders: await page.evaluate(overflowingElements, 1) }))
            expect(widths.viewport).toBe(320)
            expect(widths.scroll - widths.viewport).toBeLessThanOrEqual(1)
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
            } else {
              await page.addStyleTag({ content: STYLIST_TEXT_SPACING })
            }
            await settleAnimations(page)
            const after = await page.evaluate(clippedSnapshot)
            const newlyClipped = Object.keys(after).filter(key => !(key in before)).map(key => ({ element: key, ...after[key] }))
            if (newlyClipped.length) reportStylist(`M2 stylist dialogs ${mode} ${language} ${state} ${adjustment}`, JSON.stringify(newlyClipped.slice(0, 8)))
            expect(newlyClipped, `${state} ${mode} ${language} ${adjustment}: newly clipped elements`).toEqual([])
          }
          await page.keyboard.press('Escape')
          await expect(dialog).toBeHidden()
          if (state === 'inbox-reject') {
            const service = page.getByText(name, { exact: true })
            const metrics = await service.evaluate(el => ({ overflow: getComputedStyle(el).overflowX, width: el.clientWidth, scroll: el.scrollWidth }))
            expect(metrics.overflow).not.toBe('hidden')
            expect(metrics.scroll - metrics.width).toBeLessThanOrEqual(1)
          }
          expect(mutations).toEqual([])
        })
      }
    }
  }
}

test.afterEach(async ({}, info) => {
  if (info.title.startsWith('M2 stylist dialogs') && info.status !== info.expectedStatus) {
    reportStylist(info.title, info.errors.map(error => error.message || String(error)).join(' | ').slice(0, 2000))
  }
})

// Parameterized reschedule preview, including failure/retry and confirmation without commit.
for (const mode of ['light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const state of ['preview', 'confirm', 'retry'] as const) {
      for (const adjustment of ['320px', 'text-200', 'text-spacing'] as const) {
        test(`M2 stylist reschedule ${mode} ${language} ${state} ${adjustment}`, async ({ page }) => {
          await page.setViewportSize(adjustment === '320px' ? { width: 320, height: 720 } : { width: 1280, height: 900 })
          await page.emulateMedia({ reducedMotion: 'reduce' })
          await page.addInitScript(({ selectedMode, locale }) => {
            localStorage.removeItem('nejra.theme')
            localStorage.setItem('nejra.theme.mode', selectedMode)
            localStorage.setItem('APP_LOCALE', locale)
          }, { selectedMode: mode, locale: language })
          await page.route('**/api/settings/public', async route => {
            const response = await route.fetch()
            if (!response.ok()) throw new Error(`Public settings failed: ${response.status()}`)
            const rows = await response.json() as Array<{ key: string; value: string }>
            await route.fulfill({ response, json: [...rows.filter(row => row.key !== 'theme_default_mode'), { key: 'theme_default_mode', value: mode }] })
          })
          const proposal = { delayMinutes: 15, overrunMinutes: 15, shiftMinutes: 15, items: [{ id: 'r-next', clientId: 'c-next', serviceName: 'Svečana frizura i njega duge kose', clientName: 'Ana Test', oldStartTime: '12:00', oldEndTime: '13:00', newStartTime: '12:15', newEndTime: '13:15', shiftMinutes: 15, reducedBreakMinutes: 0 }] }
          const requests: unknown[] = []
          let commits = 0
          await page.route('**/api/reservations/m2-preview/reschedule/propose', route => {
            expect(route.request().method()).toBe('POST')
            requests.push(route.request().postDataJSON())
            return state === 'retry' && requests.length === 1 ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: proposal })
          })
          await page.route('**/api/reservations/m2-preview/reschedule/commit', route => { commits++; return route.fulfill({ status: 500, json: {} }) })
          const path = '/stylist/workbook/reschedule-preview/m2-preview'
          await page.goto(`${path}?mode=manual_minutes&manualShiftMinutes=15&includeBreaks=1`, { waitUntil: 'networkidle' })
          expect(new URL(page.url()).pathname).toBe(path)
          expect(new URL(page.url()).searchParams.get('manualShiftMinutes')).toBe('15')
          await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
          await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
          await expect(page.locator('html')).toHaveAttribute('lang', language)
          await expect.poll(() => requests.length).toBe(1)
          expect(requests[0]).toEqual({ includeBreaks: true, mode: 'manual_minutes', manualShiftMinutes: 15 })
          if (state === 'retry') {
            const error = page.getByRole('alert').filter({ hasText: /preview rekalkulacije|schedule preview/i })
            await expect(error).toBeVisible()
            await error.getByRole('button', { name: /pokušaj ponovo|retry|try again/i }).click()
            await expect.poll(() => requests.length).toBe(2)
            expect(requests[1]).toEqual(requests[0])
          }
          await expect(page.getByLabel(/ručni pomak|manual shift/i)).toHaveValue('15')
          await expect(page.getByRole('switch', { name: /uključi buduće pauze|include upcoming breaks/i })).toHaveAttribute('aria-checked', 'true')
          await expect(page.getByText(/Svečana frizura i njega duge kose/)).toBeVisible()
          await expect(page.getByText(/12:15.*13:15/)).toBeVisible()
          const trigger = page.getByRole('button', { name: /^(obavijesti klijente|notify clients)$/i })
          if (state === 'confirm') await trigger.click()
          const dialog = page.getByRole('dialog')
          if (state === 'confirm') await expect(dialog).toBeVisible()
          const settled = await settleAnimations(page)
          expect(settled?.stillRunning).toBe(0)
          if (adjustment === '320px') {
            const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
            if (widths.scroll > widths.viewport + 1) reportStylist(`M2 stylist reschedule ${mode} ${language} ${state}`, JSON.stringify({ ...widths, offenders: await page.evaluate(overflowingElements, 1) }))
            expect(widths.scroll - widths.viewport, JSON.stringify(widths)).toBeLessThanOrEqual(1)
            if (state === 'confirm') {
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
            } else await page.addStyleTag({ content: STYLIST_TEXT_SPACING })
            await settleAnimations(page)
            const after = await page.evaluate(clippedSnapshot)
            const newlyClipped = Object.keys(after).filter(key => !(key in before)).map(key => ({ element: key, ...after[key] }))
            if (newlyClipped.length) reportStylist(`M2 stylist reschedule ${mode} ${language} ${state} ${adjustment}`, JSON.stringify(newlyClipped.slice(0, 8)))
            expect(newlyClipped).toEqual([])
          }
          if (state === 'confirm') {
            await page.keyboard.press('Escape')
            await expect(dialog).toBeHidden()
          }
          expect(commits).toBe(0)
        })
      }
    }
  }
}

test.afterEach(async ({}, info) => {
  if (info.title.startsWith('M2 stylist reschedule') && info.status !== info.expectedStatus) reportStylist(info.title, info.errors.map(error => error.message || String(error)).join(' | ').slice(0, 2000))
})

// Populated stylist debts and stats; repayment dialog is opened but never submitted.
for (const mode of ['light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const state of ['debts', 'repay-dialog', 'stats'] as const) {
      for (const adjustment of ['320px', 'text-200', 'text-spacing'] as const) {
        test(`M2 stylist finance ${mode} ${language} ${state} ${adjustment}`, async ({ page }) => {
          await page.setViewportSize(adjustment === '320px' ? { width: 320, height: 720 } : { width: 1280, height: 900 })
          await page.emulateMedia({ reducedMotion: 'reduce' })
          await page.addInitScript(({ selectedMode, locale }) => {
            localStorage.removeItem('nejra.theme')
            localStorage.setItem('nejra.theme.mode', selectedMode)
            localStorage.setItem('APP_LOCALE', locale)
          }, { selectedMode: mode, locale: language })
          await page.route('**/api/settings/public', async route => {
            const response = await route.fetch()
            if (!response.ok()) throw new Error(`Public settings failed: ${response.status()}`)
            const rows = await response.json() as Array<{ key: string; value: string }>
            await route.fulfill({ response, json: [...rows.filter(row => row.key !== 'theme_default_mode'), { key: 'theme_default_mode', value: mode }] })
          })
          const debt = { id: 'debt-1', amount: 125.5, createdAt: '2026-01-02T10:00:00Z', client: { id: 'c1', username: 'amela', firstName: 'Amela', lastName: 'Dugoprezime-Testiranje' }, service: { id: 's', name: 'Svečana frizura i njega kose' }, reservation: { id: 'r', publicReferenceCode: 'M2-DEBT-001', reservationDate: '2026-01-02', startTime: '10:00', endTime: '11:00' } }
          const mutations: string[] = []
          page.on('request', request => { if (/\/api\/client-debts(?:\/|\?|$)/.test(request.url()) && request.method() !== 'GET') mutations.push(request.method()) })
          await page.route('**/api/client-debts/stylist/me', route => route.fulfill({ json: [debt] }))
          await page.route('**/api/stylists/me', route => route.fulfill({ json: { id: 'stylist-profile' } }))
          await page.route('**/api/reservations?**', route => route.fulfill({ json: [{ id: 'r1', status: 'COMPLETED' }, { id: 'r2', status: 'CONFIRMED' }] }))
          await page.route('**/api/daily-log?**', route => route.fulfill({ json: [{ id: 'log-1', status: 'COMPLETED', actualPrice: 125.5, tipAmount: 5 }] }))
          const path = state === 'stats' ? '/stylist/stats' : '/stylist/debts'
          await page.goto(path, { waitUntil: 'networkidle' })
          expect(new URL(page.url()).pathname).toBe(path)
          await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
          await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
          await expect(page.locator('html')).toHaveAttribute('lang', language)
          const root = page.locator('[data-debt-list]')
          const dialog = page.getByRole('dialog')
          if (state === 'stats') {
            await expect(page.getByText(/125[,.]50 KM/)).toBeVisible()
            await expect(page.getByText(/5[,.]00 KM/)).toBeVisible()
            await expect(page.getByText(/prihod \(dnevnik\)|workbook revenue/i)).toBeVisible()
          } else {
            await expect(root.getByText('Amela Dugoprezime-Testiranje')).toBeVisible()
            await expect(root).toContainText('M2-DEBT-001')
            await expect(root).toContainText(/125[,.]50/)
            if (state === 'repay-dialog') {
              await root.getByRole('button', { name: /naplati dug|repay debt/i }).click()
              await expect(dialog).toBeVisible()
              await expect(dialog.locator('#repayDate')).not.toHaveValue('')
              await dialog.locator('#repayNote').fill('M2 repayment note')
            }
          }
          await expect.poll(async () => (await settleAnimations(page))?.stillRunning ?? -1, { timeout: 10_000 }).toBe(0)
          if (adjustment === '320px') {
            const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
            if (widths.scroll > widths.viewport + 1) reportStylist(`M2 stylist finance ${mode} ${language} ${state}`, JSON.stringify({ ...widths, offenders: await page.evaluate(overflowingElements, 1) }))
            expect(widths.scroll - widths.viewport, JSON.stringify(widths)).toBeLessThanOrEqual(1)
            if (state === 'repay-dialog') {
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
            } else await page.addStyleTag({ content: STYLIST_TEXT_SPACING })
            await settleAnimations(page)
            const after = await page.evaluate(clippedSnapshot)
            const lost = Object.keys(after).filter(key => !(key in before)).map(key => ({ element: key, ...after[key] }))
            if (lost.length) reportStylist(`M2 stylist finance ${mode} ${language} ${state} ${adjustment}`, JSON.stringify(lost.slice(0, 8)))
            expect(lost).toEqual([])
          }
          if (state === 'repay-dialog') {
            await page.keyboard.press('Escape')
            await expect(dialog).toBeHidden()
          }
          if (state !== 'stats') {
            const metrics = await root.locator('[data-debt-client]').evaluate(el => ({ overflow: getComputedStyle(el).overflowX, width: el.clientWidth, scroll: el.scrollWidth }))
            expect(metrics.overflow).toBe('visible')
            expect(metrics.scroll - metrics.width, JSON.stringify(metrics)).toBeLessThanOrEqual(1)
          }
          expect(mutations).toEqual([])
        })
      }
    }
  }
}

test.afterEach(async ({}, info) => {
  if (info.title.startsWith('M2 stylist finance') && info.status !== info.expectedStatus) reportStylist(info.title, info.errors.map(error => error.message || String(error)).join(' | ').slice(0, 2000))
})

// Direct stylist booking with a populated client and gender-filtered service list.
for (const mode of ['light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const state of ['selected', 'missing-gender'] as const) {
      for (const adjustment of ['320px', 'text-200', 'text-spacing'] as const) {
        test(`M2 stylist direct ${mode} ${language} ${state} ${adjustment}`, async ({ page }) => {
          await page.setViewportSize(adjustment === '320px' ? { width: 320, height: 720 } : { width: 1280, height: 900 })
          await page.emulateMedia({ reducedMotion: 'reduce' })
          await page.addInitScript(({ selectedMode, locale }) => {
            localStorage.removeItem('nejra.theme')
            localStorage.setItem('nejra.theme.mode', selectedMode)
            localStorage.setItem('APP_LOCALE', locale)
          }, { selectedMode: mode, locale: language })
          await page.route('**/api/settings/public', async route => {
            const response = await route.fetch()
            if (!response.ok()) throw new Error(`Public settings failed: ${response.status()}`)
            const rows = await response.json() as Array<{ key: string; value: string }>
            await route.fulfill({ response, json: [...rows.filter(row => row.key !== 'theme_default_mode'), { key: 'theme_default_mode', value: mode }] })
          })
          const name = 'Amela Dugoprezime Test Klijent'
          const service = 'Svečana frizura i detaljna njega duge kose'
          const mutations: string[] = []
          page.on('request', request => { if (/\/api\/reservations(?:\/|\?|$)/.test(request.url()) && request.method() !== 'GET') mutations.push(request.method()) })
          await page.route('**/api/reservations**', route => route.request().method() === 'GET' ? route.fallback() : route.abort())
          await page.route('**/api/users/clients?**', route => route.fulfill({ json: { items: [{ id: 'direct-client', username: 'amela', firstName: 'Amela', lastName: 'Dugoprezime Test Klijent', gender: state === 'selected' ? 'FEMALE' : null }] } }))
          await page.route('**/api/services?**', route => route.fulfill({ json: [{ id: 'direct-service', name: service, durationMinutes: 60, price: 50, gender: 'FEMALE' }, { id: 'other-service', name: 'Muški test servis', durationMinutes: 30, price: 20, gender: 'MALE' }] }))
          const path = '/stylist/schedule/new'
          await page.goto(path, { waitUntil: 'networkidle' })
          expect(new URL(page.url()).pathname).toBe(path)
          await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
          await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
          await expect(page.locator('html')).toHaveAttribute('lang', language)
          await page.locator('#stylist-direct-booking-client').fill('Amela')
          const client = page.getByRole('button', { name: new RegExp(name) })
          await expect(client).toBeVisible()
          await client.click()
          await expect(client).toHaveAttribute('aria-pressed', 'true')
          const submit = page.getByRole('button', { name: /kreiraj termin|create appointment/i })
          if (state === 'selected') {
            const choice = page.getByRole('button', { name: new RegExp(service) })
            await expect(choice).toBeVisible()
            await expect(page.getByText('Muški test servis')).toHaveCount(0)
            await choice.click()
            await expect(choice).toHaveAttribute('aria-pressed', 'true')
            await expect(page.locator('#stylist-direct-booking-end')).toHaveValue('10:00')
            await page.locator('#stylist-direct-booking-note').fill('M2 stylist direct note')
            await expect(submit).toBeEnabled()
          } else {
            await expect(submit).toBeDisabled()
            await expect(page.getByText(service)).toHaveCount(0)
            await expect(page.getByText(/klijent nema definisan spol|client.*gender.*not/i)).toBeVisible()
          }
          await expect.poll(async () => (await settleAnimations(page))?.stillRunning ?? -1, { timeout: 10_000 }).toBe(0)
          if (adjustment === '320px') {
            const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
            if (widths.scroll > widths.viewport + 1) reportStylist(`M2 stylist direct ${mode} ${language} ${state}`, JSON.stringify({ ...widths, offenders: await page.evaluate(overflowingElements, 1) }))
            expect(widths.scroll - widths.viewport, JSON.stringify(widths)).toBeLessThanOrEqual(1)
          } else {
            const before = await page.evaluate(clippedSnapshot)
            if (adjustment === 'text-200') {
              const base = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
              await page.evaluate(size => { document.documentElement.style.fontSize = `${size * 2}px` }, base)
              await expect.poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))).toBeCloseTo(base * 2, 2)
            } else await page.addStyleTag({ content: STYLIST_TEXT_SPACING })
            await settleAnimations(page)
            const after = await page.evaluate(clippedSnapshot)
            const lost = Object.keys(after).filter(key => !(key in before)).map(key => ({ element: key, ...after[key] }))
            if (lost.length) reportStylist(`M2 stylist direct ${mode} ${language} ${state} ${adjustment}`, JSON.stringify(lost.slice(0, 8)))
            expect(lost).toEqual([])
          }
          expect(mutations).toEqual([])
        })
      }
    }
  }
}

test.afterEach(async ({}, info) => {
  if (info.title.startsWith('M2 stylist direct') && info.status !== info.expectedStatus) reportStylist(info.title, info.errors.map(error => error.message || String(error)).join(' | ').slice(0, 2000))
})
