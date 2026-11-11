import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'

import * as domMetrics from './dom-metrics.mjs'
import {
  activeElementLabel,
  overflowingElements,
  clippedSnapshot,
  describeElement,
  activeElementIsSegmentedInput,
  focusableSnapshot,
  hasVisibleFocusIndicator,
  invalidWithoutDescription,
  requiredNotMarked,
  imageBearingInventory,
  labelInNameViolations,
  landmarkSnapshot,
  probeFocusability,
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

test('focusableSnapshot preskače tabindex="-1" na SVAKOJ vrsti elementa', () => {
  // Regression za grešku koja je bila u CSS alternativama: `:not([tabindex="-1"])` je
  // važilo samo za posljednju alternativu, pa je `<button tabindex="-1">` upadao u spisak
  // preko `button:not([disabled])`. Takav element nije u tab nizu po definiciji, a Radix
  // upravo tako radi neaktivne tabove (po ARIA APG između tabova se ide strelicama).
  // Izmjereno na runu 42966480987: `/admin/finance` i `/admin/users` su zato javljali
  // „Tab ne doseže" na elementima koje Tab legitimno preskače.
  const doc = makeDom(`
    <button id="aktivan">Aktivan</button>
    <button id="neaktivni-tab" tabindex="-1">Neaktivni tab</button>
    <a href="/x" id="link-s-idx" tabindex="-1">Link</a>
    <div id="kontejner" tabindex="0">Kontejner</div>
    <div id="kontejner-minus" tabindex="-1">Kontejner</div>
  `)
  for (const el of doc.querySelectorAll('button, a, div')) setBox(el, {})

  const found = focusableSnapshot()
  assert.ok(found.some((f) => f.startsWith('button#aktivan')), 'obično dugme jeste u nizu')
  assert.ok(found.some((f) => f.startsWith('div#kontejner ')), 'tabindex="0" jeste u nizu')
  assert.equal(found.some((f) => f.includes('neaktivni-tab')), false, 'button tabindex="-1" NIJE u nizu')
  assert.equal(found.some((f) => f.includes('link-s-idx')), false, 'a tabindex="-1" NIJE u nizu')
  assert.equal(found.some((f) => f.includes('kontejner-minus')), false, 'div tabindex="-1" NIJE u nizu')
})

test('imageBearingInventory broji svaku vrstu mjesta gdje tekst može biti slika', () => {
  const doc = makeDom(`
    <img id="slika" src="/a/b/rad.jpg" alt="Rad na kosi" />
    <div id="zvijezde" role="img" aria-label="4 od 5"></div>
    <svg id="graf"><text>Prihodi</text><text>Rashodi</text></svg>
    <canvas id="platno" width="300" height="150"></canvas>
    <p id="obican">Tekst</p>
  `)
  for (const el of doc.querySelectorAll('img, div, svg, canvas, p')) setBox(el, {})
  // jsdom nema pozadinske slike po defaultu; jedna se postavi ručno.
  const saPozadinom = doc.querySelector('#obican')
  const original = globalThis.getComputedStyle
  globalThis.getComputedStyle = (el) => {
    const cs = original(el)
    if (el === saPozadinom) {
      return new Proxy(cs, {
        get: (t, k) => (k === 'backgroundImage' ? 'url("/logo.png")' : t[k]),
      })
    }
    return cs
  }

  const out = imageBearingInventory()
  assert.deepEqual(out.counts, { img: 1, roleImg: 1, svgText: 2, canvas: 1, bgImage: 1 })
  assert.equal(out.samples.img[0].src, '/a/b/rad.jpg')
  assert.equal(out.samples.img[0].alt, 'Rad na kosi')
  assert.equal(out.samples.roleImg[0].name, '4 od 5')
  assert.deepEqual(
    out.samples.svgText.map((t) => t.text),
    ['Prihodi', 'Rashodi'],
    'tekst unutar SVG-a je tekst renderovan kao grafika',
  )
  assert.equal(out.samples.canvas[0].width, 300)
  assert.equal(out.samples.bgImage[0].value, 'url("/logo.png")')
  globalThis.getComputedStyle = original
})

test('imageBearingInventory — gradijent se ne broji kao slika', () => {
  const doc = makeDom('<div id="traka">Naslov</div>')
  setBox(doc.querySelector('#traka'), {})
  const original = globalThis.getComputedStyle
  globalThis.getComputedStyle = (el) =>
    new Proxy(original(el), {
      get: (t, k) => (k === 'backgroundImage' ? 'linear-gradient(90deg, #fff, #000)' : t[k]),
    })
  const out = imageBearingInventory()
  assert.equal(out.counts.bgImage, 0, 'u gradijentu nema teksta, pa nije kandidat za 1.4.5')
  assert.deepEqual(out.counts, { img: 0, roleImg: 0, svgText: 0, canvas: 0, bgImage: 0 })
  globalThis.getComputedStyle = original
})

test('imageBearingInventory poštuje granicu uzoraka, ali broji sve', () => {
  const html = Array.from({ length: 9 }, (_, i) => `<img id="s${i}" src="/${i}.jpg" alt="" />`).join('')
  const doc = makeDom(html)
  for (const el of doc.querySelectorAll('img')) setBox(el, {})
  const out = imageBearingInventory(3)
  assert.equal(out.counts.img, 9, 'broj je stvaran, ne odsječen')
  assert.equal(out.samples.img.length, 3, 'uzorci su ograničeni da anotacija ne bude odsječena')
})

test('probeFocusability pita DOM direktno, ne zaključuje iz atributa', () => {
  const doc = makeDom(`
    <div id="kontejner" tabindex="0" role="tablist"><button id="tab" role="tab" aria-selected="true">Tab</button></div>
    <button id="obicno">Obično</button>
  `)
  for (const el of doc.querySelectorAll('div, button')) setBox(el, {})

  const out = probeFocusability(['div#kontejner "Tab"', 'button#obicno "Obično"'])
  assert.equal(out.length, 2, 'oba tražena elementa su ispitana')

  const kontejner = out.find((o) => o.label.startsWith('div#kontejner'))
  assert.equal(kontejner.tabindex, '0', 'atribut kaže da je fokusabilan')
  assert.equal(kontejner.role, 'tablist')
  // `closest()` matchuje i sâm element, pa je kontejner s `role="tablist"` uključen.
  assert.equal(kontejner.inTablist, true, 'kontejner JESTE tablista')
  assert.equal(kontejner.took, true, 'jsdom prima fokus na div s tabindex=0')

  const obicno = out.find((o) => o.label.startsWith('button#obicno'))
  assert.equal(obicno.took, true)
  assert.equal(obicno.inTablist, false, 'obično dugme nema veze s tablistom')

  const tab = probeFocusability(['button#tab "Tab"'])[0]
  assert.equal(tab.inTablist, true, 'tab jeste unutar tabliste')
  assert.equal(tab.role, 'tab')
})

test('probeFocusability — element koji ne može primiti fokus to i pokaže', () => {
  const doc = makeDom('<button id="neaktivan" disabled>Ne</button><button id="aktivan">Da</button>')
  for (const el of doc.querySelectorAll('button')) setBox(el, {})
  const out = probeFocusability(['button#neaktivan "Ne"', 'button#aktivan "Da"'])
  const neaktivan = out.find((o) => o.label.startsWith('button#neaktivan'))
  assert.equal(neaktivan.took, false, 'disabled dugme ne prima fokus')
  assert.equal(out.find((o) => o.label.startsWith('button#aktivan')).took, true)
})

test('probeFocusability — prazan i nepoznat ulaz ne pada', () => {
  makeDom('<button id="x">X</button>')
  assert.deepEqual(probeFocusability([]), [])
  assert.deepEqual(probeFocusability(undefined), [], 'bez ulaza prazno, ne pad')
  assert.deepEqual(probeFocusability(['nema-ga']), [], 'nepoznata oznaka se preskače')
})

test('activeElementIsSegmentedInput — native datum ima segmente koje Tab prebacuje', () => {
  const doc = makeDom(`
    <input id="datum" type="date" />
    <input id="vrijeme" type="time" />
    <input id="tekst" type="text" />
    <button id="dugme">Dugme</button>
  `)
  doc.querySelector('#datum').focus()
  assert.equal(activeElementIsSegmentedInput(), true, 'datum ima segmente dan/mjesec/godina')
  doc.querySelector('#vrijeme').focus()
  assert.equal(activeElementIsSegmentedInput(), true, 'i vrijeme')
  doc.querySelector('#tekst').focus()
  assert.equal(activeElementIsSegmentedInput(), false, 'obično polje nema segmente')
  doc.querySelector('#dugme').focus()
  assert.equal(activeElementIsSegmentedInput(), false, 'nije input')
  doc.body.focus()
  assert.equal(activeElementIsSegmentedInput(), false, 'fokus nije na elementu')
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

test('labelInNameViolations — van opsega 2.5.3: select, textarea i tekstualno polje', () => {
  // Kod `<select>` je `innerText` spojen tekst SVIH opcija, pa bi provjera prijavila
  // besmislen prekršaj (izmjereno na runu `42897798720` nad `/admin/reviews`).
  const doc = makeDom(`
    <select class="filter" aria-label="Filtriraj recenzije po statusu">
      <option>Sve</option><option>Na čekanju</option><option>Odobreno</option>
    </select>
    <textarea class="poruka" aria-label="Poruka">nacrt</textarea>
    <input class="ime" aria-label="Ime" type="text" />
  `)
  for (const [el, text] of [
    [doc.querySelector('select'), 'SveNa čekanjuOdobreno'],
    [doc.querySelector('textarea'), 'nacrt'],
    [doc.querySelector('input'), ''],
  ]) {
    withInnerText(el, text)
    setBox(el, {})
  }
  assert.deepEqual(labelInNameViolations(), [], 'nijedno od njih nije „dugme s vidljivomarbetom"')
})

test('labelInNameViolations — input[type=submit] JE u opsegu', () => {
  const doc = makeDom(`<input type="submit" class="posalji" aria-label="Potvrdi unos" />`)
  const el = doc.querySelector('input')
  withInnerText(el, 'Pošalji')
  setBox(el, {})
  const found = labelInNameViolations()
  assert.deepEqual(found.map((f) => f.element), ['input.posalji'])
})

test('labelInNameViolations — <a> bez href-a nije link, pa je van opsega', () => {
  // Bez `href` element nije link nego običan tekst; 2.5.3 se na njega ne primjenjuje.
  const doc = makeDom(`<a class="lazni" aria-label="Samo tekst">Naslov</a>`)
  const el = doc.querySelector('a')
  withInnerText(el, 'Naslov')
  setBox(el, {})
  assert.deepEqual(labelInNameViolations(), [])
})

// ── 3.3.1 Error identification ───────────────────────────────────────────────

test('invalidWithoutDescription — hvata aria-invalid bez teksta koji ga objašnjava', () => {
  const doc = makeDom(`
    <input id="a" name="email" aria-invalid="true" />
    <input id="b" name="datum" aria-invalid="true" aria-describedby="nepostojeci" />
    <input id="c" name="iznos" aria-invalid="true" aria-describedby="prazan" />
    <p id="prazan"></p>
  `)
  assert.deepEqual(
    invalidWithoutDescription().map((v) => v.element),
    ['input#a[name=email]', 'input#b[name=datum]', 'input#c[name=iznos]'],
  )
  const byId = Object.fromEntries(invalidWithoutDescription().map((v) => [v.element, v.describedby]))
  assert.equal(byId['input#a[name=email]'], '(nema)')
  assert.equal(byId['input#b[name=datum]'], 'nepostojeci', 'pogrešan id mora biti vidljiv u nalazu')
  assert.equal(doc.querySelectorAll('input').length, 3)
})

test('invalidWithoutDescription — ispravno pridružen tekst prolazi', () => {
  makeDom(`
    <input id="email" name="email" aria-invalid="true" aria-describedby="email-error" />
    <p id="email-error" role="alert">Unesite ispravnu e-mail adresu</p>
    <input id="ok" name="ok" />
  `)
  assert.deepEqual(invalidWithoutDescription(), [], 'bez aria-invalid nema ni prekršaja')
})

test('invalidWithoutDescription — više id-ova u aria-describedby, dovoljan je jedan s tekstom', () => {
  makeDom(`
    <input id="x" aria-invalid="true" aria-describedby="hint error" />
    <p id="hint"></p>
    <p id="error">Obavezno polje</p>
  `)
  assert.deepEqual(invalidWithoutDescription(), [])
})

// ── 3.3.2 Labels or instructions ─────────────────────────────────────────────

test('requiredNotMarked — vidljiva zvjezdica bez `required` je prekršaj', () => {
  makeDom(`
    <label for="ime">Ime *</label>
    <input id="ime" name="ime" />
  `)
  const found = requiredNotMarked()
  assert.deepEqual(found.map((f) => f.element), ['input#ime'])
  assert.equal(found[0].label, 'Ime *')
})

test('requiredNotMarked — required i aria-required zadovoljavaju zahtjev', () => {
  makeDom(`
    <label for="a">Ime *</label><input id="a" required />
    <label for="b">Prezime (obavezno)</label><input id="b" aria-required="true" />
    <label for="c">Nadimak</label><input id="c" />
  `)
  assert.deepEqual(requiredNotMarked(), [], 'označeno, ili bez vidljive oznake — nije prekršaj')
})

test('requiredNotMarked — prepoznaje i omatačku labedu bez `for`', () => {
  makeDom(`<label>E-mail *<input id="mail" /></label>`)
  assert.deepEqual(requiredNotMarked().map((f) => f.element), ['input#mail'])
})

test('requiredNotMarked — engleska varijanta i skrivene kontrole', () => {
  makeDom(`
    <label for="a">Email (required)</label><input id="a" />
    <label for="b">Slogan</label><input id="b" type="hidden" />
  `)
  assert.deepEqual(requiredNotMarked().map((f) => f.element), ['input#a'], 'hidden nije unos')
})

test('requiredNotMarked — riječ „obavezno" bez oznake je prekršaj', () => {
  // Bez ovog slučaja uklanjanje `\bobavezno\b` iz regexa prolazi neuhvaćeno: jedini test s
  // tom riječi ima `aria-required`, pa se preskoči prije nego što regex uopšte odluči.
  makeDom(`
    <label for="p">Prezime (obavezno)</label><input id="p" />
    <label for="e">Email (required)</label><input id="e" />
  `)
  assert.deepEqual(
    requiredNotMarked().map((f) => f.element),
    ['input#p', 'input#e'],
    'oba jezika, nijedno programski označeno',
  )
})

test('svaka izvozna funkcija je samostalna — Playwright šalje u preglednik samo njen izvor', () => {
  // Ovo je čuvar za grešku koju jsdom NE MOŽE uhvatiti: `page.evaluate(fn)` šalje
  // `fn.toString()` bez opsega modula, pa poziv modula-vanjskog pomoćnika postaje
  // `ReferenceError` u pregledniku — a ovdje, u Node-u, modul postoji i test prolazi.
  // Izmjereno na runu `42904859111`: 3.3.1 i 3.3.2 pali su na SVIM rutama odjednom.
  const src = readFileSync(new URL('./dom-metrics.mjs', import.meta.url), 'utf8')
  const moduleScope = [...src.matchAll(/^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm)].map(
    (m) => m[1],
  )
  for (const [name, fn] of Object.entries(domMetrics)) {
    if (typeof fn !== 'function') continue
    const body = fn.toString()
    for (const dep of moduleScope) {
      assert.ok(
        !new RegExp(`\\b${dep}\\b`).test(body),
        `${name}() referencira „${dep}" iz opsega modula — u pregledniku bi to bio ReferenceError`,
      )
    }
  }
  assert.ok(Object.keys(domMetrics).length >= 10, 'čuvar mora imati šta provjeriti')
})

test('overflowingElements — element koji reže sadržaj nije krivac za širinu stranice', () => {
  const doc = makeDom('<section class="reze" style="overflow:hidden">široko</section><div class="gura">široko</div>')
  const [reze, gura] = doc.querySelectorAll('section, div')
  for (const el of [reze, gura]) setBox(el, { scrollWidth: 400, clientWidth: 300 })
  // jsdom računa `overflow` iz inline stila, pa `section` ostaje `hidden`, a `div` je `visible`.
  assert.deepEqual(
    overflowingElements(2).map((e) => e.element),
    ['div.gura'],
    'hidden/auto/scroll režu svoj sadržaj i ne prenose višak na viewport',
  )
})
