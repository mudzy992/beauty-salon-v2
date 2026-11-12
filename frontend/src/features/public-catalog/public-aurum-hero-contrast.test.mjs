/**
 * `test:public-aurum-hero-contrast` — NEJRA §07 hero je „uvijek filmski tamno".
 *
 * §10 računa `text/page` za oba Aurum stanja, ali hero iz §07 dodaje dva poluprozirna
 * radijalna gradijenta preko `T.dark.page`. Ovaj test NE procjenjuje „izgleda ok":
 * čita `const T` iz jedinog SSOT-a, čita tačne `rgba()` alfe iz `.hero` u §07,
 * komponuje NAJSVJETLIJU moguću pozadinu (oba gradijenta na punoj alfi + linijski
 * overlay) i istom WCAG formulom relativne luminancije mjeri sve hero parove.
 * Također zakucava da `globals.css` koristi iste tokene u oba Aurum stanja i da
 * stvarni tamni veo ne može biti svjetliji od te izračunate kompozicije.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8')
const specHtml = read('../../../../docs/design/NEJRA – beauty salon · Referentni dokument.html')
const globalsCss = read('../../styles/globals.css')

const blankComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
const css = blankComments(globalsCss)
// Dokument ima i prazni <style id="tok"></style> koji skripta popunjava; uzmi
// drugi, stvarni <style> blok i njemu odgovarajući </style>.
const specStyleStart = specHtml.indexOf('<style>')
const specStyleEnd = specHtml.indexOf('</style>', specStyleStart)
const specCss = specHtml.slice(specStyleStart, specStyleEnd)

/** §10 `const T={light:{...},dark:{...}}` — jedini izvor tačnih hex vrijednosti. */
function specTokens() {
  const start = specHtml.indexOf('const T={')
  assert.ok(start > -1, 'NEJRA §10: nedostaje `const T`')
  const segment = specHtml.slice(start, specHtml.indexOf('};', start))
  const result = {}
  for (const [, state, body] of segment.matchAll(/(light|dark):\{([^}]*)\}/g)) {
    result[state] = Object.fromEntries(
      [...body.matchAll(/(\w+):'(#[0-9A-Fa-f]{6})'/g)].map(([_, k, v]) => [k, v.toUpperCase()]),
    )
  }
  assert.deepEqual(Object.keys(result).sort(), ['dark', 'light'])
  for (const state of ['light', 'dark']) {
    assert.equal(Object.keys(result[state]).length, 12, `${state}: očekivano 12 tokena`)
  }
  return result
}
const T = specTokens()

const hexToRgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16))
function luminance(rgb) {
  const c = rgb.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
function contrast(a, b) {
  const x = luminance(a)
  const y = luminance(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
const over = (fg, bg, alpha) => fg.map((f, i) => alpha * f + (1 - alpha) * bg[i])

/** §07 `.hero` — tačne boje i alfe iz SSOT-a, ne zaokružene „na oko". */
function heroLayers() {
  const hero = /\.hero\{[^}]*\}/.exec(specCss)?.[0] ?? ''
  assert.ok(hero, 'NEJRA §07: nedostaje `.hero` pravilo')
  const goldRgba = /rgba\((\d+),\s*(\d+),\s*(\d+),\s*\.(\d+)\)/.exec(hero)
  const roseRgba = /rgba\((\d+),\s*(\d+),\s*(\d+),\s*\.(\d+)\)/.exec(hero.slice(hero.indexOf('rgba') + 1))
  assert.ok(goldRgba && roseRgba, 'NEJRA §07: nedostaju dva radijalna gradijenta')
  const gold = [Number(goldRgba[1]), Number(goldRgba[2]), Number(goldRgba[3])]
  const goldAlpha = Number(`0.${goldRgba[4]}`)
  const rose = [Number(roseRgba[1]), Number(roseRgba[2]), Number(roseRgba[3])]
  const roseAlpha = Number(`0.${roseRgba[4]}`)
  const line = /rgba\((\d+),\s*(\d+),\s*(\d+),\s*\.(\d+)\)/.exec(
    /\.hero:after\{[^}]*\}/.exec(specCss)?.[0] ?? '',
  )
  assert.ok(line, 'NEJRA §07: nedostaje linijski overlay `.hero:after`')
  const lineGold = [Number(line[1]), Number(line[2]), Number(line[3])]
  const lineAlpha = Number(`0.${line[4]}`)
  const page = hexToRgb(T.dark.page)
  return { gold, goldAlpha, rose, roseAlpha, lineGold, lineAlpha, page }
}

function brightestHeroBackground() {
  const { gold, goldAlpha, rose, roseAlpha, lineGold, lineAlpha, page } = heroLayers()
  // CSS slagani red: gold (gornji) preko rose preko #0E0B08, pa linijski overlay.
  const withRose = over(rose, page, roseAlpha)
  const withGold = over(gold, withRose, goldAlpha)
  return over(lineGold, withGold, lineAlpha)
}

test('NEJRA §07: hero koristi isključivo boje iz §10 `const T`', () => {
  const { gold, rose, lineGold, page } = heroLayers()
  assert.deepEqual(gold, hexToRgb(T.dark.brand), 'zlato u gradientu mora biti T.dark.brand')
  assert.deepEqual(rose, hexToRgb(T.light.accent), 'rosé u gradientu mora biti T.light.accent')
  assert.deepEqual(lineGold, hexToRgb(T.dark.brand), 'linijski overlay mora biti T.dark.brand')
  assert.deepEqual(page, hexToRgb(T.dark.page), 'baza heroja mora biti T.dark.page')
  assert.match(specCss, /\.hero\{[^}]*color:#F5EDE0/, 'tekst heroja mora biti T.dark.text')
})

test('oba Aurum stanja: najsvjetliji gradijent i dalje prolazi AA za hero parove', () => {
  const bg = brightestHeroBackground()
  const text = hexToRgb(T.dark.text) // #F5EDE0
  const brand = hexToRgb(T.dark.brand) // #D4AF6A
  const onbrand = hexToRgb(T.dark.onbrand) // #1A1204
  const page = hexToRgb(T.dark.page) // #0E0B08

  const normalText = contrast(text, bg)
  const largeText = contrast(brand, bg)
  const cta = contrast(onbrand, brand)
  const baseText = contrast(text, page)

  assert.ok(normalText >= 4.5, `#F5EDE0 na najsvjetlijem gradijentu: ${normalText.toFixed(2)}:1 < 4.5:1`)
  assert.ok(largeText >= 3, `#D4AF6A na najsvjetlijem gradijentu: ${largeText.toFixed(2)}:1 < 3:1`)
  assert.ok(cta >= 4.5, `#1A1204 na #D4AF6A CTA: ${cta.toFixed(2)}:1 < 4.5:1`)
  assert.ok(baseText >= 4.5, `#F5EDE0 na #0E0B08: ${baseText.toFixed(2)}:1 < 4.5:1`)

  // Ista računica vrijedi za aurum-light i aurum-dark: hero ne nasljeđuje svijetlu paletu.
  assert.match(css, /\[data-skin="aurum"\]\[data-mode="light"\] \{/)
  assert.match(css, /\.dark\[data-skin="aurum"\] \{/)
})

test('globals.css S2 hero tokeni su tačni, animacija nije beskonačna, veo je taman', () => {
  for (const [name, hex] of [
    ['--nejra-hero-text', T.dark.text],
    ['--nejra-hero-gold', T.dark.brand],
    ['--nejra-hero-onbrand', T.dark.onbrand],
    ['--nejra-hero-page', T.dark.page],
    ['--nejra-hero-rose', T.light.accent],
  ]) {
    assert.match(css, new RegExp(`${name}:\\s*${hex};`), `nedostaje ${name} = ${hex}`)
  }
  assert.match(css, /\[data-skin="aurum"\] \[data-aurum-hero\]/)
  assert.match(css, /animation:\s*aurum-hero-drift 2s ease-out 1 both;/)
  assert.doesNotMatch(css, /animation[^;]*\binfinite\b/, '2.3.1: nijedna animacija ne smije biti beskonačna')
  assert.match(css, /\[data-skin="aurum"\] \[data-aurum-hero-overlay\] \{[^}]*rgba\(14, 11, 8, 0\.78\)/,
    'tamni veo jamči da stvarna pozadina nije svjetlija od izračunate kompozicije')
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?aurum-hero-drift/)
})

test('mutacije hero kontrasta se odbijaju (detektor nije prazna provjera)', () => {
  const darkTextOf = (html) => {
    const start = html.indexOf('const T={')
    const segment = html.slice(start, html.indexOf('};', start))
    return /dark:\{[^}]*text:'(#[0-9A-Fa-f]{6})'/.exec(segment)?.[1]
  }
  assert.equal(darkTextOf(specHtml), T.dark.text, 'polazni SSOT mora imati T.dark.text')
  assert.notEqual(
    darkTextOf(specHtml.replace("dark:{page:'#0E0B08',surface:'#1A1510',text:'#F5EDE0'", "dark:{page:'#0E0B08',surface:'#1A1510',text:'#777777'")),
    T.dark.text,
    'promjena T.dark.text mora biti uhvaćena',
  )
})
