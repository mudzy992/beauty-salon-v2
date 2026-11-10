import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import {
  activeElementLabel,
  clippedSnapshot,
  focusableSnapshot,
  hasVisibleFocusIndicator,
  labelInNameViolations,
  landmarkSnapshot,
  overflowingElements,
} from './dom-metrics.mjs'
import type { ClippedEntry, Landmark } from './dom-metrics.mjs'

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
    const reached = new Set<string>()

    // Generozan broj koraka: javne stranice imaju navigaciju, forme i podnožje.
    for (let i = 0; i < expected.length + 10; i += 1) {
      await page.keyboard.press('Tab')
      const label = await page.evaluate(activeElementLabel)
      if (!label) continue
      reached.add(label)

      // Fokus mora biti vidljiv — bez indikatora korisnik tastature ne zna gdje je.
      const visibleFocus = await page.evaluate(hasVisibleFocusIndicator)
      if (!visibleFocus) reportFailure(`2.1.1 ${route.path} — fokus bez indikatora`, label ?? '(bez oznake)')
      expect(visibleFocus, `${route.path}: fokus bez vidljivog indikatora na "${label}"`).toBe(true)
    }

    const missed = expected.filter((e) => !reached.has(e))
    if (missed.length) {
      reportFailure(
        `2.1.1 ${route.path} — Tab ne doseže`,
        `${missed.length}/${expected.length}: ${missed.slice(0, 6).join(' | ')}`,
      )
    }
    expect(missed, `${route.path}: Tab ne doseže ${missed.length} interaktivnih elemenata`).toEqual([])
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
