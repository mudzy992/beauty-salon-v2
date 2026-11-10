import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

import {
  activeElementLabel,
  clippedSnapshot,
  describeElement,
  focusableSnapshot,
  hasVisibleFocusIndicator,
  landmarkSnapshot,
} from './dom-metrics.mjs'

const require = createRequire(import.meta.url)
const { JSDOM } = require('jsdom')

/**
 * Testira **stvarne** funkcije koje se šalju u preglednik.
 *
 * Ovo nije dekoracija: prije nego što su izdvojene u `.mjs`, mjere su bile stringovi u specu
 * koji se eval-uju u pregledniku. Jedina provjera bi bio CI, a sintaksna greška u takvom
 * stringu srušila bi svih 36 testova odjednom — i to u poslu koji više nema
 * `continue-on-error`.
 *
 * jsdom nema raspored, pa se `getBoundingClientRect` i `scroll*`/`client*` veličine moraju
 * podmetnuti. Logika filtriranja je ono što se ovdje dokazuje; stvarne dimenzije mjeri CI.
 */

function makeDom(html) {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, {
    pretendToBeVisual: true,
  })
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
  return dom.window.document
}

/** Podmetne veličine da jsdom-ov nedostatak rasporeda ne sakrije logiku. */
function setBox(el, { scrollWidth = 0, clientWidth = 0, scrollHeight = 0, clientHeight = 0, w = 10, h = 10 }) {
  Object.defineProperty(el, 'scrollWidth', { value: scrollWidth, configurable: true })
  Object.defineProperty(el, 'clientWidth', { value: clientWidth, configurable: true })
  Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true })
  Object.defineProperty(el, 'clientHeight', { value: clientHeight, configurable: true })
  el.getBoundingClientRect = () => ({ width: w, height: h, top: 0, left: 0, bottom: h, right: w })
}

test('describeElement daje čitljiv opis s id-om, klasama i tekstom', () => {
  const doc = makeDom('<div id="glavni" class="kontejner okvira visak jos">Naslov</div>')
  assert.equal(describeElement(doc.querySelector('#glavni')), 'div#glavni.kontejner.okvira "Naslov"')

  makeDom('<button class="dugme"></button>')
  assert.equal(describeElement(document.querySelector('button')), 'button.dugme')
})

test('clippedSnapshot hvata samo ono što stvarno siječe sadržaj', () => {
  const doc = makeDom(`
    <div id="sijece" style="overflow:hidden">Predugacak tekst</div>
    <div id="skroluje" style="overflow:auto">Predugacak tekst</div>
    <div id="vidljivo" style="overflow:visible">Predugacak tekst</div>
    <div id="prazno" style="overflow:hidden"></div>
  `)
  setBox(doc.querySelector('#sijece'), { scrollWidth: 500, clientWidth: 100 })
  setBox(doc.querySelector('#skroluje'), { scrollWidth: 500, clientWidth: 100 })
  setBox(doc.querySelector('#vidljivo'), { scrollWidth: 500, clientWidth: 100 })
  setBox(doc.querySelector('#prazno'), { scrollWidth: 500, clientWidth: 100 })

  const result = clippedSnapshot()
  const keys = Object.keys(result)
  assert.equal(keys.length, 1, `očekivan 1 element, dobijeno ${JSON.stringify(keys)}`)
  assert.match(keys[0], /^div#sijece/)
  assert.deepEqual(result[keys[0]], { dx: 400, dy: 0 })
})

test('clippedSnapshot tolerira razliku do 2px (antialiasing, ne gubitak)', () => {
  const doc = makeDom('<div id="malo" style="overflow:hidden">Tekst</div>')
  setBox(doc.querySelector('#malo'), { scrollWidth: 102, clientWidth: 100 })
  assert.deepEqual(clippedSnapshot(), {})

  setBox(doc.querySelector('#malo'), { scrollWidth: 103, clientWidth: 100 })
  assert.equal(Object.keys(clippedSnapshot()).length, 1)
})

test('clippedSnapshot preskače nevidljive elemente', () => {
  const doc = makeDom('<div id="skriven" style="overflow:hidden; visibility:hidden">Tekst</div>')
  setBox(doc.querySelector('#skriven'), { scrollWidth: 500, clientWidth: 100 })
  assert.deepEqual(clippedSnapshot(), {}, 'nevidljiv element nije gubitak sadržaja')
})

test('focusableSnapshot nabraja interaktivne, a preskače aria-hidden i nevidljive', () => {
  const doc = makeDom(`
    <a href="/x" id="link">Link</a>
    <button id="dugme">Dugme</button>
    <button id="neaktivno" disabled>Ne</button>
    <div aria-hidden="true"><button id="skriveno">Skriveno</button></div>
    <input id="polje" />
  `)
  for (const el of doc.querySelectorAll('a, button, input')) setBox(el, {})
  setBox(doc.querySelector('#skriveno'), { w: 0, h: 0 })

  const found = focusableSnapshot()
  assert.ok(found.some((f) => f.startsWith('a#link')), 'link mora biti naveden')
  assert.ok(found.some((f) => f.startsWith('button#dugme')))
  assert.ok(found.some((f) => f.startsWith('input#polje')))
  assert.equal(found.some((f) => f.includes('neaktivno')), false, 'disabled nije fokusabilan')
  assert.equal(found.some((f) => f.includes('skriveno')), false, 'aria-hidden nije dio 2.1.1')
})

test('focusableSnapshot preskače elemente bez dimenzija', () => {
  const doc = makeDom('<button id="nula">Nula</button>')
  setBox(doc.querySelector('#nula'), { w: 0, h: 0 })
  assert.deepEqual(focusableSnapshot(), [])
})

test('hasVisibleFocusIndicator: false bez fokusa, true s outline-om', () => {
  makeDom('<button id="dugme">Dugme</button>')
  assert.equal(hasVisibleFocusIndicator(), false, 'bez aktivnog elementa nema indikatora')

  document.querySelector('#dugme').focus()
  document.querySelector('#dugme').style.outline = '2px solid black'
  assert.equal(hasVisibleFocusIndicator(), true)
})

test('landmarkSnapshot vraća landmarke u DOM redoslijedu s vizuelnom pozicijom', () => {
  const doc = makeDom('<header>H</header><main>M</main><footer>F</footer>')
  const tags = doc.querySelectorAll('header, main, footer')
  const tops = [0, 100, 900]
  tags.forEach((el, i) => {
    setBox(el, {})
    el.getBoundingClientRect = () => ({ width: 100, height: 50, top: tops[i], left: 0, bottom: 50, right: 100 })
  })

  const result = landmarkSnapshot()
  assert.deepEqual(result.map((r) => r.tag), ['header', 'main', 'footer'])
  assert.deepEqual(result.map((r) => r.top), tops)
  assert.deepEqual(result.map((r) => r.dom), [0, 1, 2])
})

test('landmarkSnapshot preskače landmarke bez dimenzija', () => {
  const doc = makeDom('<header>H</header><nav></nav><main>M</main>')
  setBox(doc.querySelector('header'), {})
  setBox(doc.querySelector('nav'), { w: 0, h: 0 })
  setBox(doc.querySelector('main'), {})
  assert.deepEqual(landmarkSnapshot().map((r) => r.tag), ['header', 'main'])
})

test('activeElementLabel: null bez fokusa, opis kad je element fokusiran', () => {
  makeDom('<button id="dugme" class="btn primarno">Pošalji</button>')
  assert.equal(activeElementLabel(), null, 'bez fokusa nema oznake')
  document.querySelector('#dugme').focus()
  assert.equal(activeElementLabel(), 'button#dugme.btn.primarno "Pošalji"')
})

test('activeElementLabel i describeElement daju ISTU oznaku — inače se skupovi ne bi poklopili', () => {
  makeDom('<button id="dugme" class="btn primarno">Pošalji</button>')
  const el = document.querySelector('#dugme')
  el.focus()
  assert.equal(activeElementLabel(), describeElement(el))
})
