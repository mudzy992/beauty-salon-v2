import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadScenarios } from './render-harness.mjs'

/**
 * axe-core nad **stvarno renderovanim** markupom — bez preglednika.
 *
 * ── Zašto ovo postoji ────────────────────────────────────────────────────────
 * Svi ostali a11y testovi u ovom repou čitaju **tekst izvora** (regex) ili, u
 * slučaju `render-smoke.test.mjs`, samo dokazuju da komponenta ne padne. Ništa
 * od toga ne provjerava WCAG pravila nad onim što se stvarno renderuje.
 *
 * Pravi preglednik ovdje nije moguć i to je izmjereno, ne pretpostavljeno:
 * nijedan browser binary ne postoji, a **svih 15** dijeljenih biblioteka koje
 * Chromium traži (`libnss3`, `libatk-1.0`, `libgbm`, `libcairo`, `libpango`, …)
 * nedostaje. Zato `@axe-core/playwright` (`test:a11y-routes`) u ovom okruženju
 * ne može da se izvrši.
 *
 * Ali axe ne treba preglednik — treba DOM. `render-harness.mjs` već proizvodi
 * pravi markup (`renderToStaticMarkup`), a `jsdom` daje DOM. `axe-core@4.14.0`
 * je već bio instaliran kroz Q4. Izmjereno 2026-11-10: **35 scenarija, 31
 * pravilo PASS, 84 INAPPLICABLE, 3 INCOMPLETE**. Izmjereno 2026-11-08 nakon
 * popravke prazne tabele u `DataTable`-u: **35 scenarija, 32 PASS, 2 INCOMPLETE** —
 * `th-has-data-cells` je prešao iz nepotpunih u odlučivo prolaz.
 *
 * ── Šta ovo NE dokazuje (bez uljepšavanja) ───────────────────────────────────
 * `jsdom` nema raspored, pa axe ova dva pravila vraća kao **INCOMPLETE**, ne kao
 * prolaz: `color-contrast`, `label-content-name-mismatch` (WCAG 2.5.3).
 * Znači **1.4.3/1.4.6 kontrast, 2.5.3, 2.5.8 Target Size,
 * 1.4.10 Reflow, 1.4.12 Text Spacing i 2.4.3 Focus Order ostaju nepokriveni** —
 * kontrast i dalje čuva `check_ui_contrast.py --strict`, ostalo ručna provjera.
 * Ne pokriva ni `/admin/**` rute ni stanje s podacima: harness renderuje šablone
 * i dashboard, ne stranice s ruterom i API-jem.
 *
 * ── Zašto omotač `<main>` postoji — i šta ovaj test NE evaluira ──────────────
 * Markup se ubacuje u `<html lang="bs"><body><main id="main" tabindex="-1">`.
 *
 * `<main>` je **nužan**: axe se pokreće nad `document.body`, a pravilo `region`
 * (sav sadržaj mora biti unutar landmarka) bez njega pada na **svakoj**
 * komponenti — a to je svojstvo shell-a, ne komponente. Izmjereno: s `<main>` →
 * `region` pass; bez njega → VIOLATION.
 *
 * 🔴 `lang="bs"` u omotaču **nije** nužan i ne smije se čitati kao pokrivenost.
 * Budući da je scope `document.body`, pravila `html-has-lang`, `document-title`
 * i `landmark-one-main` su **INAPPLICABLE** — uopšte se ne evaluiraju (izmjereno
 * 2026-11-10). Ostaje samo da DOM bude vjeran: `index.html:2` stvarno ima
 * `<html lang="bs">`, a sva tri layouta (`admin-layout.tsx:179`,
 * `StylistLayout.tsx:166`, `public-layout.tsx:394`) imaju
 * `<main id="main" tabIndex={-1}>`. Dokument-nivo pravila čuva
 * `shell-a11y.test.mjs`, ne ovaj test.
 */

const here = dirname(fileURLToPath(import.meta.url))
const frontendRoot = join(here, '..', '..', '..', '..', '..')
const require_ = createRequire(import.meta.url)
const { JSDOM, VirtualConsole } = require_('jsdom')
const axeSource = readFileSync(join(frontendRoot, 'node_modules', 'axe-core', 'axe.min.js'), 'utf8')

/**
 * `recharts` (preko `Dashboard`) crta na `<canvas>`, a jsdom bez `@napi-rs/canvas`
 * baca „Not implemented: HTMLCanvasElement's getContext()". To nije greška koda
 * pod testom, pa se filtrira — ali **sve ostalo** ide na stderr, da se stvarni
 * jsdomError ne sakrije iza filtera.
 */
function quietConsole() {
  const vc = new VirtualConsole()
  vc.on('jsdomError', (error) => {
    if (!/Not implemented: HTMLCanvasElement/.test(error.message)) console.error(error.message)
  })
  return vc
}

function domFor(fragmentHtml) {
  return new JSDOM(
    `<!DOCTYPE html><html lang="bs"><body><main id="main" tabindex="-1">${fragmentHtml}</main></body></html>`,
    { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: quietConsole() },
  )
}

async function axeOn(fragmentHtml) {
  const dom = domFor(fragmentHtml)
  try {
    dom.window.eval(axeSource)
    const result = await dom.window.axe.run(dom.window.document.body)
    return {
      violations: result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.html.slice(0, 160)),
      })),
      passedRules: new Set(result.passes.map((p) => p.id)),
      incompleteRules: new Set(result.incomplete.map((p) => p.id)),
      inapplicableRules: new Set(result.inapplicable.map((p) => p.id)),
    }
  } finally {
    dom.window.close()
  }
}

const scenarios = await loadScenarios()
const names = Object.keys(scenarios)

const runs = []
for (const name of names) {
  runs.push({ name, ...(await axeOn(scenarios[name]())) })
}
const allPassed = new Set()
const allIncomplete = new Set()
const alwaysInapplicable = new Set(runs[0].inapplicableRules)
for (const run of runs) {
  run.passedRules.forEach((id) => allPassed.add(id))
  run.incompleteRules.forEach((id) => allIncomplete.add(id))
  // presjek: pravila koja se NI U JEDNOM scenariju ne evaluiraju
  for (const id of [...alwaysInapplicable]) {
    if (!run.inapplicableRules.has(id)) alwaysInapplicable.delete(id)
  }
}

test('axe nad renderovanim markupom: nijedan WCAG prekršaj', () => {
  const bad = []
  for (const run of runs) {
    for (const v of run.violations) {
      bad.push(`${run.name}: ${v.id} [${v.impact}] -> ${v.nodes.join(' , ')}`)
    }
  }
  assert.deepEqual(
    bad,
    [],
    'axe je našao prekršaj nad stvarno renderovanim markupom (ne nad tekstom izvora).\n  ' +
      bad.join('\n  '),
  )
})

test('pozitivna kontrola: axe je stvarno evaluirao pravila, nije prošao prazno', () => {
  assert.ok(runs.length >= 25, `samo ${runs.length} scenarija — harness nije renderovao`)
  assert.ok(
    allPassed.size >= 20,
    `samo ${allPassed.size} pravila je prošlo — axe vjerovatno nije ni evaluiran ` +
      '(bez ove kontrole test bi „prošao" i kad je DOM prazan)',
  )
  // Izmjereno 2026-11-10: color-contrast, label-content-name-mismatch, th-has-data-cells.
  // Ako jsdom ikad dobije raspored, ovaj skup se mijenja — i to treba vidjeti.
  assert.deepEqual(
    [...allIncomplete].sort(),
    ['color-contrast', 'label-content-name-mismatch'],
    'promijenio se skup pravila koja jsdom NE može evaluirati — ažuriraj dokumentaciju ' +
      'iznad (šta ovaj test dokazuje, a šta ne)',
  )
  // `th-has-data-cells` je 2026-11-08 IZAŠAO s gornjeg popisa: prazna tabela u
  // `DataTable`-u dobila je `<td colSpan>` u `<tfoot>`, pa pravilo više nije nepotpuno ni
  // u jsdom-u. To je dokaz da je popravka stvarna, a ne da je mjera oslabila — i čuva se
  // u oba smjera: pravilo mora biti odlučivo PROLAZ, ne nepotpuno i ne odsutno.
  assert.ok(
    allPassed.has('th-has-data-cells'),
    'th-has-data-cells mora biti odlučivo prolaz — ako je opet nepotpuno, prazna tabela ' +
      'je ostala bez podatkovne ćelije',
  )
})

test('axe hvata `<input>` bez imena — dokaz da mjerenje nije prazno', async () => {
  const { violations } = await axeOn('<input>')
  const ids = violations.map((v) => v.id)
  assert.ok(
    ids.includes('label'),
    `axe nad namjerno pokvarenim markupom nije prijavio 'label' (dobijeno: ${ids.join(', ') || 'ništa'}) ` +
      '— mjerenje je prazno i „0 prekršaja" iznad nema vrijednost',
  )
})

test('pozitivna kontrola: dokument-nivo pravila se ovdje NE evaluiraju (scope je body)', () => {
  // Ovo NIJE nedostatak nego granica koju test mora javno držati: da neko sutra
  // proširi scope na `document`, ova asertacija pada i podsjeća da se ažurira
  // dokumentacija iznad (jer bi tada `html-has-lang` i `document-title` postali
  // prolazi koje daje OMOTAČ, a ne kod pod testom).
  for (const id of ['html-has-lang', 'document-title', 'landmark-one-main']) {
    assert.ok(
      alwaysInapplicable.has(id),
      `pravilo '${id}' se počelo evaluirati — scope više nije document.body. ` +
        'Ažuriraj komentar iznad: dokument-nivo pravila nisu pokrivenost komponenti.',
    )
  }
})

test('pozitivna kontrola: axe hvata nevalidnu ARIA vrijednost', async () => {
  const { violations } = await axeOn('<div role="slider" aria-label="x"></div>')
  const ids = violations.map((v) => v.id)
  assert.ok(
    ids.includes('aria-required-attr'),
    `axe nije prijavio 'aria-required-attr' za role="slider" bez aria-valuenow ` +
      `(dobijeno: ${ids.join(', ') || 'ništa'}) — strukturna ARIA pravila se ne evaluiraju`,
  )
})
