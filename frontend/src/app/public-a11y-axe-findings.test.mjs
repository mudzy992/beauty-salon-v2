/**
 * Faza 13 — nalazi iz PRVOG STVARNOG axe-core rendera (vlasnik, 2026-11-09).
 *
 * `npm run test:a11y-routes` se prvi put izvršio na mašini s browserom: 11 testova,
 * 3 prošla, 8 palo. Ovaj test zakucava četiri ispravke kao source-contract, jer se axe
 * ne može pokrenuti u sandboxu (nema browser binarnog fajla).
 *
 * Nalazi i njihovo porijeklo:
 *  1. `label-content-name-mismatch` (serious, WCAG 2.5.3) — 6 ruta.
 *     `<button aria-label="Prebaci jezik na Engleski">BS</button>`: vidljivi tekst "BS"
 *     nije bio dio pristupačnog imena.
 *  2. `image-alt` (critical, WCAG 1.1.1) — `/register`.
 *     `<img class="aspect-square h-full w-full object-cover" src="/brand/media-fallback.jpg">`
 *     bez `alt` (AvatarImage, `pages/Register.tsx:231`).
 *  3. `color-contrast` (serious, WCAG 1.4.3) — `/kontakt`, 2 čvora.
 *     `text-slate-500` (#64748b) na `bg-slate-200` (#e2e8f0) = **3.86:1** (axe izmjerio).
 *  4. `2.4.1` skip-link — prvi Tab na javnom sajtu išao je na logo, jer `SkipLink`
 *     postoji samo u admin/stylist shellu.
 *
 * Bez browsera: izvorni ugovor.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const at = (p) => readFileSync(join(SRC, p), 'utf8')

test('2.5.3: pristupačno ime jezičnog prekidača sadrži vidljivi tekst', () => {
  const src = at('components/i18n/language-switcher.tsx')
  // vidljivi tekst i aria-label moraju dijeliti istu varijablu
  assert.match(src, /const visibleCode = currentLanguage\.toUpperCase\(\)/)
  assert.match(src, /const accessibleName = `\$\{visibleCode\} — \$\{actionLabel\}`/)
  assert.match(src, /aria-label=\{accessibleName\}/)
  assert.match(src, /\{visibleCode\}/)
  // regresija: aria-label ne smije biti "goli" actionLabel
  assert.doesNotMatch(src, /aria-label=\{actionLabel\}/)
})

test('1.1.1: AvatarImage uvijek ima alt (default dekorativan)', () => {
  const src = at('components/ui/avatar.tsx')
  assert.match(src, /alt = ''/, 'AvatarImage mora imati default alt')
  assert.match(src, /alt=\{alt\}/, 'alt se mora proslijediti na <img>')
  // `pages/Register.tsx` NAMJERNO ne prosljeđuje alt (preview vlastitog avatara je
  // dekorativan) — oslanja se na default iz primitiva, pa više nije critical.
  assert.match(at('pages/Register.tsx'), /<AvatarImage src=\{avatarPreview \?\? undefined\} \/>/)
  // pozivaoci koji nose značenje i dalje prosljeđuju svoj alt
  assert.match(at('layouts/StylistLayout.tsx'), /shell\.profileForUser/)
  assert.match(at('features/shell/public/public-layout.tsx'), /shell\.profileForUser/)
})

test('1.4.3: placeholder mape nema tekst ispod 4.5:1 na svojoj pozadini', () => {
  const src = at('pages/public/PublicContact.tsx')
  const i = src.indexOf('mapTitle')
  assert.ok(i > 0, 'mapTitle nije naden')
  // kontejner s bg-slate-200 koji nosi tekst mape
  const block = src.slice(Math.max(0, i - 400), i + 200)
  assert.match(block, /bg-slate-200/)
  assert.match(block, /text-slate-600/, 'očekivano text-slate-600 (6.15:1 na #e2e8f0)')
  assert.doesNotMatch(block, /text-slate-500/, 'slate-500 je 3.86:1 na bg-slate-200 (axe nalaz)')
})

test('2.4.1: javni layout ima skip-link kao prvi element i cilj s tabIndex', () => {
  const src = at('features/shell/public/public-layout.tsx')
  assert.match(src, /import \{ SkipLink \}/)

  const root = src.indexOf('<div data-public-shell className="min-h-screen bg-white flex flex-col">')
  assert.ok(root > 0, 'glavni return javnog layouta nije naden')
  const after = src.slice(root, root + 700)
  // SkipLink mora biti PRIJE <header>
  const skip = after.indexOf('<SkipLink')
  const header = after.indexOf('<header')
  assert.ok(skip > 0, 'SkipLink nije u glavnom returnu')
  assert.ok(header > 0, '<header> nije naden')
  assert.ok(skip < header, `SkipLink (${skip}) mora biti prije <header> (${header})`)

  // cilj mora imati id i tabIndex da fokus zaista skoči
  assert.match(src, /<main id="main" tabIndex=\{-1\}/)
})
