import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import {
  activeElementLabel,
  clippedSnapshot,
  focusableSnapshot,
  hasVisibleFocusIndicator,
  landmarkSnapshot,
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
    expect(lost, `${route.path}: 200% teksta gubi sadržaj na ${lost.length} elementa`).toEqual([])

    const overflowAfter = await measureHorizontalOverflow(page)
    expect(
      overflowAfter,
      `${route.path}: horizontalni overflow se pogoršao s ${overflowBefore}px na ${overflowAfter}px pri 200%`,
    ).toBeLessThanOrEqual(Math.max(overflowBefore, 0) + 2)
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
      expect(visibleFocus, `${route.path}: fokus bez vidljivog indikatora na "${label}"`).toBe(true)
    }

    const missed = expected.filter((e) => !reached.has(e))
    expect(missed, `${route.path}: Tab ne doseže ${missed.length} interaktivnih elemenata`).toEqual([])
  })
}
