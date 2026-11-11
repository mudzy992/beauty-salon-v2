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
  visibleTextNotInName,
  imageBearingInventory,
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

// ── 2.5.3 Label in Name — mjera koja sama presuđuje ─────────────────────────
//
// Axe pravilo `label-content-name-mismatch` na 22 admin/stylist rute vraća
// **incomplete** s porukom „Unable to determine if the visible text is part of the
// accessible name" — to nije nalaz nego nesigurnost, pa se ne može ni potvrditi ni
// opovrgnuti. `visibleTextNotInName` računa oba teksta sama i presuđuje: vidljivi
// tekst mora biti dio `aria-label`-a, jer glasovni korisnik izgovara ono što vidi.
for (const route of STYLIST_ROUTES) {
  test(`2.5.3 stylist: vidljivi tekst je dio pristupačnog imena — ${route.name} (${route.path})`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'networkidle' })

    const violations = await page.evaluate(visibleTextNotInName)

    if (violations.length) {
      process.stdout.write(
        `::error title=2.5.3 ${route.path}::` +
          violations
            .map((v) => `${v.element}: vidljivo „${v.visible}“ nije dio imena „${v.name}“`)
            .join(' | ')
            .replace(/%/g, '%25')
            .replace(/\r/g, '%0D')
            .replace(/\n/g, '%0A') +
          '\n',
      )
    }

    expect(
      violations,
      `${route.path}: vidljivi tekst nije dio pristupačnog imena — glasovni korisnik koji ` +
        'izgovori ono što vidi ne pogađa kontrolu',
    ).toEqual([])
  })
}
