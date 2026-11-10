import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

import {
  activeElementLabel,
  overflowingElements,
  clippedSnapshot,
  describeElement,
  focusableSnapshot,
  hasVisibleFocusIndicator,
  labelInNameViolations,
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

test('overflowingElements — nalazi samo element koji širi stranicu, i to u px', () => {
  const doc = makeDom('<main class="w-screen"><section class="grid">tekst</section></main>')
  setBox(doc.querySelector('main'), { scrollWidth: 2035, clientWidth: 1280 })
  setBox(doc.querySelector('section'), { scrollWidth: 1280, clientWidth: 1280 })

  const found = overflowingElements(2)
  assert.equal(found.length, 1, 'element koji ne širi stranicu ne ide na spisak')
  assert.equal(found[0].element, 'main.w-screen')
  assert.equal(found[0].excess, 755, 'višak mora biti izmjeren, ne pretpostavljen')
  assert.equal(found[0].overflowX, 'visible')
})

test('overflowingElements — poštuje toleranciju i sortira po veličini viška', () => {
  const doc = makeDom('<div class="mali"></div><div class="veliki"></div><div class="unutar"></div>')
  // DOM redoslijed je namjerno OBRNUT od veličine viška: bez sorta bi 'mali' bio prvi.
  setBox(doc.querySelector('.mali'), { scrollWidth: 600, clientWidth: 100 })
  setBox(doc.querySelector('.veliki'), { scrollWidth: 2000, clientWidth: 100 })
  setBox(doc.querySelector('.unutar'), { scrollWidth: 103, clientWidth: 100 })

  const all = overflowingElements(2)
  assert.deepEqual(
    all.map((e) => e.element),
    ['div.veliki', 'div.mali', 'div.unutar'],
    'sortira po višku, ne po DOM redoslijedu',
  )
  assert.deepEqual(
    all.map((e) => e.excess),
    [1900, 500, 3],
  )

  const tight = overflowingElements(5)
  assert.deepEqual(
    tight.map((e) => e.element),
    ['div.veliki', 'div.mali'],
    'višak od 3px je unutar tolerancije 5',
  )
})

/** jsdom nema `innerText`, a upravo on odlučuje šta je „vidljivo". */
function withInnerText(el, text) {
  Object.defineProperty(el, 'innerText', { value: text, configurable: true })
  return el
}

test('labelInNameViolations — hvata dugme čije ime ne sadrži vidljivi tekst', () => {
  const doc = makeDom(`<button class="meni" aria-label="Admin meni"><span>NJ</span></button>`)
  withInnerText(doc.querySelector('button'), 'NJ')
  setBox(doc.querySelector('button'), {})

  const found = labelInNameViolations()
  assert.equal(found.length, 1)
  assert.equal(found[0].element, 'button.meni')
  assert.equal(found[0].name, 'Admin meni')
  assert.equal(found[0].visible, 'nj', 'normalizovano na mala slova')
})

test('labelInNameViolations — ime koje sadrži vidljivi tekst prolazi', () => {
  const doc = makeDom(`<button class="meni" aria-label="Admin meni, NJ">NJ</button>`)
  withInnerText(doc.querySelector('button'), 'NJ')
  setBox(doc.querySelector('button'), {})
  assert.deepEqual(labelInNameViolations(), [])
})

test('labelInNameViolations — preskače neinteraktivno, nevidljivo i bez vidljivog teksta', () => {
  const doc = makeDom(`
    <div aria-label="Samo omotac">tekst</div>
    <button aria-label="Ikona"></button>
    <a href="#" aria-label="Nazad" class="skriven">Nazad</a>
  `)
  const [wrap, icon, link] = doc.querySelectorAll('div, button, a')
  withInnerText(wrap, 'tekst')
  withInnerText(icon, '')
  withInnerText(link, 'Nazad')
  setBox(wrap, {})
  setBox(icon, {})
  setBox(link, { w: 0, h: 0 })

  const found = labelInNameViolations()
  assert.deepEqual(
    found.map((f) => f.element),
    [],
    'div nije interaktivan; ikona nema vidljivog teksta; link je nevidljiv',
  )
})

test('labelInNameViolations — poštuje aria-hidden i višestruke razmake', () => {
  const doc = makeDom(`
    <button aria-label="Admin meni" aria-hidden="true">NJ</button>
    <button class="dva" aria-label="Admin   meni">N   J</button>
  `)
  const [hidden, two] = doc.querySelectorAll('button')
  withInnerText(hidden, 'NJ')
  withInnerText(two, 'N   J')
  setBox(hidden, {})
  setBox(two, {})

  const found = labelInNameViolations()
  assert.deepEqual(
    found.map((f) => f.element),
    ['button.dva'],
    'aria-hidden se preskače, a razmaci se sažimaju na obje strane',
  )
})

test('labelInNameViolations — gleda SAMO interaktivne elemente, ne svaki aria-label', () => {
  const doc = makeDom(`<div class="omotac" aria-label="Samo omotac">tekst</div>`)
  withInnerText(doc.querySelector('div'), 'tekst')
  setBox(doc.querySelector('div'), {})
  assert.deepEqual(labelInNameViolations(), [], 'div nema ulogu dugmeta ni linka')
})

test('labelInNameViolations — innerText, ne textContent: skriveni tekst nije vidljiv', () => {
  const doc = makeDom(`<button class="ikona" aria-label="Zatvori">NJ</button>`)
  const btn = doc.querySelector('button')
  // textContent ima „NJ", ali se ne iscrtava — upravo slučaj ikonice s nevidljivim slovom.
  withInnerText(btn, '')
  setBox(btn, {})
  assert.deepEqual(labelInNameViolations(), [], 'textContent bi dao lažni prekršaj')
})

test('labelInNameViolations — element širine 0 se preskače', () => {
  const doc = makeDom(`<button class="nula" aria-label="Meni">NJ</button>`)
  withInnerText(doc.querySelector('button'), 'NJ')
  setBox(doc.querySelector('button'), { w: 0, h: 12 })
  assert.deepEqual(labelInNameViolations(), [], 'ništa se ne iscrtava, pa nema vidljivog teksta')
})

test('labelInNameViolations — element BEZ aria-label se ne provjerava', () => {
  // Ovo je rupa koju je otkrio CI (run 42896831615), a jsdom testovi nisu: `[aria-label]`
  // nadovezan na cijelu listu važi samo za posljednji selektor, pa su svi linkovi ušli u
  // provjeru i javljali „nije u „null"".
  const doc = makeDom(`
    <a class="nav" href="/">Početna</a>
    <button class="bez">Dugme bez labele</button>
    <span role="button" class="span">Klik</span>
  `)
  for (const [el, text] of [
    [doc.querySelector('a'), 'Početna'],
    [doc.querySelector('button'), 'Dugme bez labele'],
    [doc.querySelector('span'), 'Klik'],
  ]) {
    withInnerText(el, text)
    setBox(el, {})
  }
  assert.deepEqual(labelInNameViolations(), [], 'bez aria-label nema ni prekršaja 2.5.3')
})
