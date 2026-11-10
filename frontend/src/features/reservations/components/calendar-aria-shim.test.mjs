import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'

import { applyCalendarAriaShim, observeCalendarAriaShim } from './calendar-aria-shim.mjs'

const require = createRequire(import.meta.url)
const axe = require('axe-core')
const { JSDOM } = require('jsdom')

/**
 * react-big-calendar@1.20.0 gradi ARIA strukturu koju axe odbija na /admin/reservations/calendar.
 * Izmjereno u CI runu 42866264214 (anotacija koraka `axe`, jer log i artefakt nisu dostupni):
 *
 *   aria-required-children (critical) ×1  — .rbc-row-content[role=row]
 *   aria-required-parent   (critical) ×8  — span[role=columnheader] unutar button.rbc-button-link
 *   scrollable-region-focusable (serious) ×1 — .rbc-time-content
 *
 * Fiksura ispod je **doslovno HTML iz te anotacije**, pa test ne pretpostavlja markup nego ga
 * reproducira. Šim se izvršava stvarno (zato je logika u .mjs, a ne u .ts).
 */
const RBC_MARKUP = `<div id="cal">
  <div class="rbc-row-content" role="row"><div class="rbc-addons-dnd-row-body"><div class="rbc-row"></div><div class="rbc-row"></div></div></div>
  <div class="rbc-header"><button type="button" class="rbc-button-link"><span role="columnheader" aria-sort="none">09 pon</span></button></div>
  <div class="rbc-time-content"></div>
</div>`

const RULES = ['aria-required-children', 'aria-required-parent', 'scrollable-region-focusable']

function makeDom(markup) {
  const dom = new JSDOM(markup, { pretendToBeVisual: true })
  for (const [name, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    Node: dom.window.Node,
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
    // Node nema MutationObserver; šim ga koristi kao browser API, pa se u testu mora
    // izložiti onaj iz jsdoma.
    MutationObserver: dom.window.MutationObserver,
  })) {
    globalThis[name] = value
  }
  return dom.window.document.getElementById('cal')
}

async function scan(root) {
  const result = await axe.run(root, { runOnly: RULES })
  const counts = Object.fromEntries(RULES.map((id) => [id, 0]))
  for (const violation of result.violations) counts[violation.id] = violation.nodes.length
  return { counts, incomplete: result.incomplete.map((v) => v.id) }
}

const scheduler = readFileSync(new URL('./ReservationScheduler.tsx', import.meta.url), 'utf8')

test('fiksura reproducira prekršaje iz CI anotacije, prije bilo kakve popravke', async () => {
  const root = makeDom(RBC_MARKUP)
  const { counts } = await scan(root)
  // Izmjereno: aria-required-parent je ×2, ne ×1 — i .rbc-row-content[role=row] traži roditelja
  // (rowgroup/grid/table), pa jedan čvor nosi dva prekršaja.
  assert.equal(counts['aria-required-children'], 1)
  assert.equal(counts['aria-required-parent'], 2)
})

test('applyCalendarAriaShim skida nevažeći role="row" i dodaje tabindex skrolabilnoj regiji', async () => {
  const root = makeDom(RBC_MARKUP)
  applyCalendarAriaShim(root)

  assert.equal(root.querySelector('.rbc-row-content').hasAttribute('role'), false)
  assert.equal(root.querySelector('.rbc-time-content').getAttribute('tabindex'), '0')

  const { counts } = await scan(root)
  assert.equal(counts['aria-required-children'], 0)
  // Preostaje samo columnheader: njega rješava components.header, ne šim. Ovo je namjerno —
  // dokazuje da šim ne dira ništa što ne mora.
  assert.equal(counts['aria-required-parent'], 1)
})

test('šim NE dira role="columnheader" — za njega postoji podržana zamjena propom', () => {
  const root = makeDom(RBC_MARKUP)
  applyCalendarAriaShim(root)
  const header = root.querySelector('span[role="columnheader"]')
  assert.ok(header, 'šim ne smije ukloniti columnheader')
  assert.equal(header.getAttribute('role'), 'columnheader')
  assert.equal(header.getAttribute('aria-sort'), 'none')
})

test('SchedulerColumnHeader renderuje span bez uloge, pa columnheader više ne traži roditelja', async () => {
  assert.match(scheduler, /function SchedulerColumnHeader/)
  const body = scheduler.slice(
    scheduler.indexOf('function SchedulerColumnHeader'),
    scheduler.indexOf('function SchedulerColumnHeader') + 400,
  )
  assert.match(body, /<span>\{label\}<\/span>/)
  assert.equal(/role=/.test(body), false, 'zamjena ne smije postavljati nikakvu ulogu')

  const fixed = RBC_MARKUP.replace(
    '<span role="columnheader" aria-sort="none">09 pon</span>',
    '<span>09 pon</span>',
  )
  const root = makeDom(fixed)
  applyCalendarAriaShim(root)
  const { counts } = await scan(root)
  assert.deepEqual(counts, {
    'aria-required-children': 0,
    'aria-required-parent': 0,
    'scrollable-region-focusable': 0,
  })
})

test('MutationObserver ponavlja popravku nakon što rbc re-renderuje i vrati svoje atribute', async () => {
  const root = makeDom(RBC_MARKUP)
  const disconnect = observeCalendarAriaShim(root)
  assert.equal(root.querySelector('.rbc-time-content').getAttribute('tabindex'), '0')

  // Simulacija re-rendera: React vrati role="row" i skine tabindex.
  root.querySelector('.rbc-row-content').setAttribute('role', 'row')
  root.querySelector('.rbc-time-content').removeAttribute('tabindex')

  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(root.querySelector('.rbc-row-content').hasAttribute('role'), false)
  assert.equal(root.querySelector('.rbc-time-content').getAttribute('tabindex'), '0')

  disconnect()
  root.querySelector('.rbc-row-content').setAttribute('role', 'row')
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(
    root.querySelector('.rbc-row-content').getAttribute('role'),
    'row',
    'poslije disconnect() šim mora prestati dirati DOM',
  )
})

test('šim je povezan na kontejner kalendara u ReservationScheduleru', () => {
  assert.match(scheduler, /useCalendarAriaShim\(calendarShellRef\)/)
  assert.match(scheduler, /const calendarShellRef = useRef<HTMLDivElement \| null>\(null\)/)
  assert.match(scheduler, /<div ref=\{calendarShellRef\} className="rounded-xl border border-line overflow-hidden">/)
  assert.match(scheduler, /header: SchedulerColumnHeader as any,/)
})

test('scrollable-region-focusable se u jsdomu NE može dokazati — nema rasporeda', async () => {
  // Bez uljepšavanja: jsdom nema layout, pa `.rbc-time-content` nije skrolabilna i axe pravilo
  // uopšte ne primjenjuje (nije ni violation ni incomplete). tabindex="0" je postavljen i
  // provjeren atributski iznad, ali da ga axe stvarno prihvata potvrđuje samo CI run nad
  // renderovanim markupom.
  const root = makeDom(RBC_MARKUP)
  const { counts, incomplete } = await scan(root)
  assert.equal(counts['scrollable-region-focusable'], 0)
  assert.equal(incomplete.includes('scrollable-region-focusable'), false)
})
