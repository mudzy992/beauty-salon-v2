import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import {
  activeElementLabel,
  clippedSnapshot,
  focusableSnapshot,
  hasVisibleFocusIndicator,
  invalidWithoutDescription,
  labelInNameViolations,
  landmarkSnapshot,
  overflowingElements,
  requiredNotMarked,
} from './dom-metrics.mjs'
import type { ClippedEntry, Landmark } from './dom-metrics.mjs'
import { analyzeTabTraversal, describeTraversal } from './tab-traversal.mjs'

/**
 * WCAG kriteriji koji traže **raspored**, pa ih jsdom (`test:axe-render-a11y`) i axe
 * (`a11y-*.spec.ts`) ne mogu dokazati — ali pravi Chromium u CI poslu `a11y-e2e` može.
 *
 * ── Zašto diferencijalno mjerenje ────────────────────────────────────────────
 * Naivna provjera „ima li elemenata koji sijeku tekst" daje stotine lažnih pozitivnih:
 * `overflow: hidden` je legitiman na dekorativnim okvirima. Pravo pitanje WCAG-a 1.4.4 i
 * 1.4.12 je **uzročno**: da li zumiranje, odnosno razmak teksta, **prouzrokuje** gubitak
 * sadržaja? Zato se skup elemenata koji sijeku sadržaj mjeri PRIJE i POSLIJE, a prijavljuje
 * se samo **razlika**. Time nestaje sav šum postojećeg stanja.
 *
 * ── Zašto su mjere u `dom-metrics.mjs` ───────────────────────────────────────
 * Playwright serializira izvor funkcije za `page.evaluate`. Da su mjere ostale stringovi u
 * ovom fajlu, jedina provjera bi bio CI — a sintaksna greška u takvom stringu srušila bi
 * svih 36 testova odjednom, u poslu koji više nema `continue-on-error`. Ovako ih
 * `dom-metrics.test.mjs` stvarno izvršava nad jsdom-om (11/11), uključujući i dokaz da
 * `activeElementLabel` i `describeElement` daju **istu** oznaku — bez toga se skupovi
 * „očekivano" i „dosegnuto" u provjeri 2.1.1 ne bi poklopili ni kad je sve ispravno.
 *
 * ── Šta ovo NE dokazuje ──────────────────────────────────────────────────────
 * 1.3.2 se provjerava samo za **redoslijed landmarka**, ne za svaki element — potpuna
 * provjera značenja redoslijeda treba čitač ekrana. 2.1.1 provjerava dostižnost Tab-om i
 * vidljivost fokusa, ne i da svaka funkcija radi s tastature (npr. drag u kalendaru).
 */

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

type Clipped = Record<string, ClippedEntry>

/**
 * Iznese detalj pada u CI anotaciju **prije** asertacije.
 *
 * Bez ovoga se zna samo IME testa koji je pao: anotacija koraka `axe` nosila je imena
 * ruta, ne i brojeve (izmjereno na runu `42886348870`). A bez brojeva se ne može razlikovati
 * stvarni prekršaj od prestarog testa.
 *
 * Mehanizam je provjeren, ne pretpostavljen: GitHub sam parsira `::error`/`::warning` iz
 * stdouta koraka — na runu `42887204875` svih 6 `::error` linija stiglo je kao zasebna
 * anotacija. Zato detalj ide ovdje, a ne samo u poruku asertacije.
 */
function reportFailure(title: string, detail: string): void {
  const encoded = detail.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
  process.stdout.write(`::error title=${title}::${encoded}\n`)
}

/**
 * Izmjeren, ali još NEPOPRAVLJEN nalaz — u anotaciju kao upozorenje, ne kao pad.
 *
 * Razlika prema `reportFailure` nije kozmetička: ovim se bilježi broj (npr. 755px
 * horizontalnog skrola) uz tačno imenovan krivac, dok kriterij koji se testira ostaje
 * zelen jer taj broj nije njegov prekršaj.
 */
function reportFinding(title: string, detail: string): void {
  const encoded = detail.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
  process.stdout.write(`::warning title=${title}::${encoded}\n`)
}

async function measureClipped(page: Page): Promise<Clipped> {
  return page.evaluate(clippedSnapshot)
}

async function measureHorizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
}

/** Razlika: šta je POČELO da siječe sadržaj poslije intervencije. */
function regressions(before: Clipped, after: Clipped): string[] {
  return Object.keys(after)
    .filter((key) => !(key in before))
    .map((key) => `${key} (dx ${after[key].dx}, dy ${after[key].dy})`)
}

// Tačne vrijednosti iz WCAG 2.1 definicije kriterija 1.4.12.
const TEXT_SPACING_CSS = `
  *, *::before, *::after {
    line-height: 1.5 !important;
    letter-spacing: 0.12em !important;
    word-spacing: 0.16em !important;
  }
  p { margin-bottom: 2em !important; }
`

// ── 1.4.4 Resize text 200% ────────────────────────────────────────────────────

for (const route of PUBLIC_ROUTES) {
  test(`1.4.4 Resize text 200%: ${route.name} (${route.path})`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'networkidle' })
    const before = await measureClipped(page)
    // Diferencijalno i za overflow: pojedini kontejneri legitimo imaju horizontalni skrol,
    // pa se mjeri POGORŠANJE, ne apsolutna vrijednost.
    const overflowBefore = await measureHorizontalOverflow(page)

    // Skala je rem-bazirana, pa se 200% postiže na korijenu — kao browser zoom za tekst.
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%'
    })
    await page.waitForTimeout(300)

    const lost = regressions(before, await measureClipped(page))
    if (lost.length) reportFailure(`1.4.4 ${route.path} — gubitak sadržaja`, lost.slice(0, 6).join(' | '))
    expect(lost, `${route.path}: 200% teksta gubi sadržaj na ${lost.length} elementa`).toEqual([])

    // Horizontalni skrol NIJE prekršaj 1.4.4. Kriterij glasi „resize bez GUBITKA sadržaja
    // ili funkcionalnosti", a sadržaj koji se doseže skrolom nije izgubljen — to je gore
    // izmjereno i bilo je nula na svih 9 ruta. Zabranu horizontalnog skrola nosi 1.4.10
    // Reflow, i to pri 320px širine, ne pri 200% fonta na 1280px.
    //
    // Run `42887204875` izmjerio je identičnih 755px na svih 6 ruta javnog omotača i 0px na
    // /rezervacija — jedan zajednički krivac, ne šest defekata. Prijavljuje se kao nalaz
    // 1.4.10 s imenovanjem elementa, a ne kao pad 1.4.4.
    // ⚠️ Ovo NIJE asertacija namjerno. Horizontalni skrol pri 200% fonta nije prekršaj
    // 1.4.4 (sadržaj je dosegljiv) ni 1.4.10 (koji vrijedi pri 320px, vidi test ispod) —
    // ali je stvarni defekt koji je popravljen u `public-layout.tsx` (755px → 0), pa ostaje
    // kao regresijski čuvar u anotaciji. Da postane asertacija, trebao bi vlastiti kriterij.
    const overflowAfter = await measureHorizontalOverflow(page)
    if (overflowAfter > Math.max(overflowBefore, 0) + 2) {
      const offenders = await page.evaluate(overflowingElements, 2)
      reportFinding(
        `1.4.10 ${route.path} — horizontalni skrol pri 200%`,
        `prije ${overflowBefore}px, pri 200% ${overflowAfter}px; krivci: ` +
          offenders
            .slice(0, 3)
            .map((o) => `${o.element} +${o.excess}px`)
            .join(', '),
      )
    }
  })
}

// ── 1.4.12 Text spacing ───────────────────────────────────────────────────────

for (const route of PUBLIC_ROUTES) {
  test(`1.4.12 Text spacing: ${route.name} (${route.path})`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'networkidle' })
    const before = await measureClipped(page)

    await page.addStyleTag({ content: TEXT_SPACING_CSS })
    await page.waitForTimeout(300)

    const lost = regressions(before, await measureClipped(page))
    if (lost.length) reportFailure(`1.4.12 ${route.path} — gubitak sadržaja`, lost.slice(0, 6).join(' | '))
    expect(lost, `${route.path}: WCAG razmak teksta gubi sadržaj na ${lost.length} elementa`).toEqual([])
  })
}

// ── 1.3.2 Meaningful sequence ─────────────────────────────────────────────────

for (const route of PUBLIC_ROUTES) {
  test(`1.3.2 Meaningful sequence: ${route.name} (${route.path})`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'networkidle' })

    // Landmarki moraju ići istim redoslijedom u DOM-u i vizuelno — inače čitač ekrana
    // najavljuje sadržaj redoslijedom koji ne odgovara onome što se vidi.
    const order: Landmark[] = await page.evaluate(landmarkSnapshot)
    const byVisual = [...order].sort((a, b) => a.top - b.top).map((o) => o.tag)
    const byDom = [...order].sort((a, b) => a.dom - b.dom).map((o) => o.tag)

    if (JSON.stringify(byDom) !== JSON.stringify(byVisual)) {
      reportFailure(
        `1.3.2 ${route.path} — redoslijed landmarka`,
        `DOM [${byDom.join(' > ')}] vs vizuelno [${byVisual.join(' > ')}] :: ` +
          order.map((o) => `${o.tag}@${o.top}px(dom#${o.dom})`).join(' '),
      )
    }
    // Run 42887204875: tri rute pale su OVDJE, a nijedna anotacija o redoslijedu nije
    // ispisana — dakle poredak se poklapao, a nedostajao je <main>. Bez ovog ispisa se
    // nije moglo znati je li <main> odsutan ili samo nevidljiv (landmarkSnapshot preskače
    // elemente nulte veličine).
    if (!byDom.includes('main')) {
      reportFailure(
        `1.3.2 ${route.path} — nema <main>`,
        order.length
          ? `viđeni landmarki: ${order.map((o) => `${o.tag}@${o.top}px(dom#${o.dom})`).join(' ')}`
          : 'nijedan landmark (header/nav/main/footer) nije imao veličinu',
      )
    }
    expect(byDom, `${route.path}: DOM redoslijed landmarka ne odgovara vizuelnom`).toEqual(byVisual)
    expect(byDom, `${route.path}: stranica nema <main>`).toContain('main')
  })
}

// ── 2.1.1 Keyboard ────────────────────────────────────────────────────────────

for (const route of PUBLIC_ROUTES) {
  test(`2.1.1 Keyboard: ${route.name} (${route.path})`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'networkidle' })

    const expected: string[] = await page.evaluate(focusableSnapshot)
    // Bilježi se NIZ, ne skup: skup dokazuje dostižnost (2.1.1) ali baca redoslijed, a
    // redoslijed je upravo ono što 2.4.3 traži. Isti prolazak daje obje tvrdnje.
    const visited: (string | null)[] = []

    // Generozan broj koraka: javne stranice imaju navigaciju, forme i podnožje.
    for (let i = 0; i < expected.length + 10; i += 1) {
      await page.keyboard.press('Tab')
      const label = await page.evaluate(activeElementLabel)
      visited.push(label)
      if (!label) continue

      // Fokus mora biti vidljiv — bez indikatora korisnik tastature ne zna gdje je.
      const visibleFocus = await page.evaluate(hasVisibleFocusIndicator)
      if (!visibleFocus) reportFailure(`2.1.1 ${route.path} — fokus bez indikatora`, label ?? '(bez oznake)')
      expect(visibleFocus, `${route.path}: fokus bez vidljivog indikatora na "${label}"`).toBe(true)
    }

    const traversal = analyzeTabTraversal({ expected, visited })

    if (traversal.unvisited.length) {
      reportFailure(
        `2.1.1 ${route.path} — Tab ne doseže`,
        `${traversal.unvisited.length}/${traversal.expectedCount}: ${traversal.unvisited.slice(0, 6).join(' | ')}`,
      )
    }
    expect(
      traversal.unvisited,
      `${route.path}: Tab ne doseže ${traversal.unvisited.length} interaktivnih elemenata`,
    ).toEqual([])

    // 2.1.2: fokus se ne smije zaglaviti. Do sad je ovo bilo dokazano samo iz izvora
    // („Radix fokus trap"); sada je izmjereno pritiscima Tab.
    if (traversal.stuckAt) {
      reportFailure(`2.1.2 ${route.path} — fokus zaglavljen`, describeTraversal(traversal))
    }
    expect(traversal.stuckAt, `${route.path}: fokus zaglavljen na "${traversal.stuckAt}"`).toBe(null)

    // 2.4.3: redoslijed fokusa mora pratiti značenje sadržaja, a DOM redoslijed je ono
    // što se može izmjeriti bez čitača ekrana. Pozitivni `tabindex` i vizuelno
    // preslagivanje bez preslagivanja DOM-a isplivaju upravo ovdje.
    if (traversal.orderMismatch) {
      reportFailure(`2.4.3 ${route.path} — redoslijed fokusa`, describeTraversal(traversal))
    }
    expect(
      traversal.orderMismatch,
      `${route.path}: redoslijed fokusa ne prati DOM — ${describeTraversal(traversal)}`,
    ).toBe(null)
  })
}

// ── 2.5.3 Label in Name ──────────────────────────────────────────────────────
//
// Mjeri se ovdje, a ne preko axe-a: axe pravilo `label-content-name-mismatch` vraća
// `incomplete` i onda kad je sve ispravno (run `42895442598` — „Admin meni, C" i dalje
// „Unable to determine"). Direktno poređenje `aria-label` i `innerText` nema tu rupu.
for (const route of PUBLIC_ROUTES) {
  test(`2.5.3 Label in name: ${route.name} (${route.path})`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'networkidle' })

    const bad = await page.evaluate(labelInNameViolations)
    if (bad.length) {
      reportFailure(
        `2.5.3 ${route.path} — ime ne sadrži vidljivi tekst`,
        bad.slice(0, 4).map((b) => `${b.element}: „${b.visible}" nije u „${b.name}"`).join(' | '),
      )
    }
    expect(bad, `${route.path}: pristupačno ime ne sadrži vidljivi tekst`).toEqual([])
  })
}

// ── 3.3.1 Error identification / 3.3.2 Labels or instructions ────────────────
//
// Obje mjere su o VEZI, ne o postojanju teksta negdje na stranici: 3.3.1 traži da
// `aria-describedby` na neispravnom polju razriješi u element sa sadržajem, a 3.3.2 da
// vidljiva oznaka „obavezno" bude i programski vidljiva (`required`/`aria-required`), jer
// čitač ekrana zvjezdicu ne čita.
for (const route of PUBLIC_ROUTES) {
  test(`3.3.1 neispravno polje ima pridružen tekst — ${route.name} (${route.path})`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'networkidle' })

    // Na /login i /register se greška izazove stvarnim pokušajem slanja: mjerenje samog
    // učitanog stanja ne bi dokazalo ništa, jer tada nijedno polje još nije neispravno.
    if (route.path === '/login' || route.path === '/register') {
      await page.locator('form button[type="submit"]').first().click({ trial: false }).catch(() => {})
      await page.waitForTimeout(300)
    }

    const bad = await page.evaluate(invalidWithoutDescription)
    if (bad.length) {
      reportFailure(`3.3.1 ${route.path} — aria-invalid bez teksta`, bad.slice(0, 4).map((b) => `${b.element} → ${b.describedby}`).join(' | '))
    }
    expect(bad, `${route.path}: neispravno polje bez pridruženog teksta`).toEqual([])
  })

  test(`3.3.2 vidljiva oznaka obaveznog je i programski označena — ${route.name} (${route.path})`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'networkidle' })

    const bad = await page.evaluate(requiredNotMarked)
    if (bad.length) {
      reportFailure(`3.3.2 ${route.path} — obavezno bez required`, bad.slice(0, 4).map((b) => `${b.element} „${b.label}"`).join(' | '))
    }
    expect(bad, `${route.path}: vidljiva oznaka obaveznog bez programskog oznake`).toEqual([])
  })
}

// ── 1.4.10 Reflow ────────────────────────────────────────────────────────────
//
// Normativni tekst: „bez gubitka informacija ili funkcionalnosti i bez skrolanja u dvije
// dimenzije za vertikalni sadržaj **na širini od 320 CSS piksela**". Dakle mjeri se na
// 320px — a NE pri 200% fonta na 1280px, što je bio nalaz koji je ovaj kriterij otvorio.
// To su dva različita zahtjeva i dva različita viewporta.
for (const route of PUBLIC_ROUTES) {
  test(`1.4.10 Reflow 320px: ${route.name} (${route.path})`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    await page.goto(route.path, { waitUntil: 'networkidle' })

    const overflow = await measureHorizontalOverflow(page)
    if (overflow > 2) {
      const offenders = await page.evaluate(overflowingElements, 2)
      reportFailure(
        `1.4.10 ${route.path} — horizontalni skrol na 320px`,
        `${overflow}px; krivci: ` +
          offenders
            .slice(0, 4)
            .map((o) => `${o.element} +${o.excess}px`)
            .join(', '),
      )
    }
    expect(
      overflow,
      `${route.path}: na 320px stranica zahtijeva horizontalni skrol (${overflow}px)`,
    ).toBeLessThanOrEqual(2)
  })
}
