/**
 * Faza 13 — 2.1.1 Keyboard: izbor kategorije u admin galeriji.
 *
 * Nalaz (2026-11-09, trijaža `jsx-a11y` upozorenja): lint je na `Gallery.tsx` javio dva
 * upozorenja koja su bila **lažno pozitivna** (`stopPropagation` div i `<label>` s tekstom
 * u ugniježđenim `<span>`), ali **nije** uhvatio stvarni prekršaj — `<Card onClick>`.
 * `Card` renderuje običan `<div>` (`components/ui/card.tsx:7`), bez `role`/`tabIndex`/
 * `onKeyDown`, pa klik na karticu kategorije tastaturom nije bio moguć.
 *
 * Zašto je to bio tvrd prekršaj, a ne samo nelagodnost: `loadImages` je **jedini** poziv koji
 * postavlja `selectedCatId` (`Gallery.tsx:98`), a `selectedCatId` počinje kao `null` (`:58`).
 * Bez njega desni panel ostaje prazan (`:338` `!selectedCatId ? …`). Dakle tastaturni
 * korisnik nije mogao uopšte otvoriti galeriju nijedne kategorije.
 *
 * Zašto `<button>`, a ne `role="button"` na `Card`-u: kartica sadrži dva `<Button>` (edit/
 * delete). `role="button"` na roditelju bi napravio **ugniježđene interaktivne kontrole**
 * (4.1.2), pa je pravo dugme oko teksta ispravno rješenje.
 *
 * Bez browsera: izvorni ugovor.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/Gallery.tsx', import.meta.url), 'utf8')
const card = readFileSync(new URL('../../components/ui/card.tsx', import.meta.url), 'utf8')

/**
 * Blok jedne kartice kategorije — od `categories.map` do `</Card>`, **bez JSX komentara**.
 *
 * Skidanje komentara je obavezno, ne kozmetika: komentar u izvoru namjerno sadrži doslovne
 * stringove `<button>` i `<p>` (objašnjava zašto su odabrani), pa bi naivni `indexOf('<button')`
 * pogodio **komentar** na poziciji ispred pravog elementa. Bez ovoga test pada iako je kod
 * ispravan — izmjereno 2026-11-09: `<button` se u bloku javlja na 455 (komentar), 935 i 969.
 */
const cardBlock = (() => {
  const start = source.indexOf('{categories.map((c) => (')
  assert.ok(start > 0, 'nije nađen categories.map blok')
  const end = source.indexOf('</Card>', start)
  assert.ok(end > start, 'nije nađen </Card>')
  return source.slice(start, end).replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
})()

test('Card je i dalje običan <div> — zato onClick na njemu nije bio dostupan tastaturom', () => {
  // Ovo je razlog zašto popravka ne smije nazad na `Card onClick`.
  assert.match(card, /<div/)
  assert.doesNotMatch(card, /role=/, 'Card nema role — nije interaktivan element')
})

test('2.1.1: izbor kategorije je pravo <button>, ne onClick na Card-u', () => {
  // Regresija: onClick se ne smije vratiti na Card.
  assert.doesNotMatch(cardBlock, /<Card[\s\S]{0,400}?onClick=/,
    'Card ponovo ima onClick — tastaturni pristup bi bio izgubljen')

  // Mora postojati pravo dugme koje poziva loadImages.
  assert.match(cardBlock, /<button\s/, 'nema <button> u kartici kategorije')
  const btnStart = cardBlock.indexOf('<button')
  assert.ok(btnStart >= 0, 'nije nađen <button>')
  // ⚠️ NE `indexOf('>')`: puca na `=>` iz `onClick={() => …}` i odsiječe open tag.
  // Tražimo prvi '>' koji NIJE dio '=>'.
  let btnEnd = btnStart
  while ((btnEnd = cardBlock.indexOf('>', btnEnd + 1)) !== -1) {
    if (cardBlock[btnEnd - 1] !== '=') break
  }
  assert.ok(btnEnd > btnStart, 'nije nađen kraj otvorajućeg <button> taga')
  const openTag = cardBlock.slice(btnStart, btnEnd)
  assert.match(openTag, /onClick=\{\(\) => void loadImages\(c\.id\)\}/,
    'dugme ne bira kategoriju')
  assert.match(openTag, /type="button"/, 'dugme bez type="button" bi submitovalo formu')
})

test('4.1.2: stanje izabrane kategorije je izloženo (aria-pressed)', () => {
  // `selectedCatId === c.id` se vizuelno vidi (border/bg); čitač ekrana to nije znao.
  assert.match(cardBlock, /aria-pressed=\{selectedCatId === c\.id\}/)
})

test('4.1.2: nema ugniježđenih interaktivnih kontrola u dugmetu', () => {
  // Zbog ovoga Card NIJE dobio role="button": sadrži dva <Button>.
  const btnStart = cardBlock.indexOf('<button')
  const btnEnd = cardBlock.indexOf('</button>', btnStart)
  assert.ok(btnEnd > btnStart, 'nije nađen </button>')
  const inner = cardBlock.slice(btnStart, btnEnd)
  assert.doesNotMatch(inner, /<Button/, 'ugniježđen <Button> unutar <button>')
  assert.doesNotMatch(inner, /<input|<select|<textarea/, 'ugniježđena forma unutar <button>')
  // <p> nije dozvoljen sadržaj unutar <button>
  assert.doesNotMatch(inner, /<p[\s>]/, '<p> unutar <button> je nevalidan HTML')
})

test('loadImages je i dalje jedini put do selectedCatId', () => {
  // Ako se pojavi drugi setter, gornja asertija o "jednom dugmetu" može postati zastarjela.
  const calls = (source.match(/setSelectedCatId\(/g) ?? []).length
  assert.equal(calls, 2, `očekivano 2 poziva setSelectedCatId (loadImages + reset), nađeno ${calls}`)
  assert.match(source, /const loadImages = useCallback/, 'loadImages nije nađen')
})
