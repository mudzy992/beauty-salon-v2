/**
 * `test:theme-ssot-sync` — NEJRA HTML je JEDINI izvor boja (Q7). Ovaj test čita
 * `const T` iz §10 i poredi ga s dva Aurum bloka u `globals.css`: 12 tačnih hex
 * tokena po stanju, HSL trojke izvedene iz tih hexova i raw brand/ring hexove.
 * Sprječava da se kod vremenom razdvoji od specifikacije („ne izmišljaj boje").
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8')
const blankComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
const specHtml = read('../../../../../docs/design/NEJRA – beauty salon · Referentni dokument.html')
const globalsCss = read('../../../styles/globals.css')
const tailwindConfig = read('../../../../tailwind.config.js')
const tailwindCode = blankComments(tailwindConfig)
const contrastScript = read('../../../../../scripts/check_ui_contrast.py')

const css = blankComments(globalsCss)
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function cssBlock(selector) {
  const match = new RegExp(`${escapeRe(selector)}\\s*\\{([^{}]*)\\}`).exec(css)
  return match ? match[1] : null
}
const vars = (block) => {
  const out = new Map()
  for (const m of block.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) out.set(m[1], m[2].trim())
  return out
}

/** §10 `const T={light:{...},dark:{...}}` — jedini izvor tačnih hex vrijednosti. */
function specTokens() {
  const start = specHtml.indexOf('const T={')
  assert.ok(start > -1, 'NEJRA §10: nedostaje `const T`')
  const segment = specHtml.slice(start, specHtml.indexOf('};', start))
  const result = {}
  for (const [, state, body] of segment.matchAll(/(light|dark):\{([^}]*)\}/g)) {
    result[state] = Object.fromEntries(
      [...body.matchAll(/(\w+):'(#[0-9A-Fa-f]{6})'/g)].map((m) => [m[1], m[2].toUpperCase()]),
    )
  }
  assert.deepEqual(Object.keys(result).sort(), ['dark', 'light'])
  for (const state of ['light', 'dark']) {
    assert.equal(Object.keys(result[state]).length, 12, `${state}: očekivano 12 tokena`)
  }
  return result
}
const T = specTokens()

/** Mapa postojećih semantičkih tokena na NEJRA §10 token (ista kao u globals.css). */
const HSL_MAP = {
  background: 'page', foreground: 'text', card: 'surface', 'card-foreground': 'text',
  popover: 'surface', 'popover-foreground': 'text', primary: 'brand', 'primary-foreground': 'onbrand',
  secondary: 'soft', 'secondary-foreground': 'text', muted: 'soft', 'muted-foreground': 'muted',
  accent: 'soft', 'accent-foreground': 'text', destructive: 'err', 'destructive-foreground': 'surface',
  border: 'border', input: 'border', ring: 'brand',
  surface: 'surface', 'surface-muted': 'soft', 'surface-sunken': 'page',
  text: 'text', 'text-muted': 'muted', 'text-muted-strong': 'text',
  line: 'border', 'control-border': 'border', 'input-border': 'border',
  'on-primary': 'onbrand', 'nav-active-bg': 'soft', danger: 'err', 'on-danger': 'surface',
  'ok-fg': 'ok', 'ok-bg': 'surface', 'warn-fg': 'warn', 'warn-bg': 'surface',
  'bad-fg': 'err', 'bad-bg': 'surface', 'info-fg': 'text', 'info-bg': 'soft',
  'neutral-fg': 'muted', 'neutral-bg': 'soft',
}
const RAW_MAP = {
  'brand-primary': 'brand', 'brand-accent': 'accent',
  'brand-primary-text-light': 'brand', 'brand-primary-text-dark': 'text',
  'brand-primary-text': 'brand', 'brand-primary-ring': 'brand',
  'brand-accent-text-light': 'accent', 'brand-accent-text-dark': 'text',
  'brand-accent-text': 'accent', 'brand-accent-ring': 'accent',
  'focus-ring': 'brand',
}
const ORDER = ['page', 'surface', 'text', 'muted', 'brand', 'onbrand', 'accent', 'border', 'soft', 'ok', 'warn', 'err']

const hexToRgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16))
function hslToRgb(value) {
  const m = /^\s*(-?[\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*$/.exec(value)
  assert.ok(m, `nije HSL trojka: ${value}`)
  const h = ((Number(m[1]) % 360) + 360) % 360 / 360
  const s = Number(m[2]) / 100
  const l = Number(m[3]) / 100
  if (s === 0) return [l, l, l].map((c) => Math.round(c * 255))
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hue = (t) => {
    let x = t
    if (x < 0) x += 1
    if (x > 1) x -= 1
    if (x < 1 / 6) return p + (q - p) * 6 * x
    if (x < 1 / 2) return q
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
    return p
  }
  return [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)].map((c) => Math.round(c * 255))
}

const SELECTORS = {
  light: '[data-skin="aurum"][data-mode="light"]',
  dark: '.dark[data-skin="aurum"]',
}

test('oba Aurum bloka postoje, s većom specifičnošću i ispravnim color-scheme', () => {
  assert.ok(cssBlock(SELECTORS.light), 'nedostaje blok Aurum svijetla')
  assert.ok(cssBlock(SELECTORS.dark), 'nedostaje blok Aurum tamna')
  assert.match(cssBlock(SELECTORS.light), /color-scheme:\s*light;/)
  assert.match(cssBlock(SELECTORS.dark), /color-scheme:\s*dark;/)
  // R2 / `dark_yes`: Aurum tamna koristi i `.dark` i `data-skin="aurum"`; njen
  // selektor mora biti iza običnog `.dark` bloka da specifičnost (0,2,0) pobjedi.
  assert.ok(css.indexOf(SELECTORS.dark) > css.indexOf('\n  .dark {'),
    '.dark[data-skin="aurum"] mora biti poslije .dark bloka')
  assert.match(css, /\[data-skin="aurum"\] \.aurum-heading \{\s*font-family: var\(--font-aurum-serif\);/)

  // Klasični blokovi ostaju netaknuti i bez Aurum tokena.
  const root = cssBlock(':root')
  const dark = cssBlock('.dark')
  assert.ok(root && dark)
  assert.match(root, /--brand-primary:\s*#632238;/)
  assert.match(root, /--surface:\s*0 0% 100%;/)
  assert.match(dark, /--neutral-bg:\s*240 4\.9% 23\.9%;/)
  for (const [name, block] of [[':root', root], ['.dark', dark]]) {
    assert.doesNotMatch(block, /--aurum-/, `${name} ne smije sadržavati Aurum tokene`)
  }
})

for (const state of ['light', 'dark']) {
  test(`${state}: 12 --aurum-* hexova se TAČNO poklapa s NEJRA §10`, () => {
    const tokens = vars(cssBlock(SELECTORS[state]))
    for (const key of ORDER) {
      assert.equal(tokens.get(`aurum-${key}`)?.toUpperCase(), T[state][key],
        `${state}: --aurum-${key} odstupa od NEJRA §10 (${T[state][key]})`)
    }
    assert.equal([...tokens.keys()].filter((k) => k.startsWith('aurum-')).length, 12)
  })

  test(`${state}: semantički HSL i raw hex tokeni su izvedeni iz istih NEJRA boja`, () => {
    const tokens = vars(cssBlock(SELECTORS[state]))
    for (const [name, source] of Object.entries(HSL_MAP)) {
      const expected = hexToRgb(T[state][source])
      const actual = hslToRgb(tokens.get(name) ?? '')
      for (let channel = 0; channel < 3; channel += 1) {
        assert.ok(Math.abs(expected[channel] - actual[channel]) <= 1,
          `${state}: --${name} (${tokens.get(name)}) ne odgovara ${source}=${T[state][source]}`)
      }
    }
    for (const [name, source] of Object.entries(RAW_MAP)) {
      assert.equal(tokens.get(name)?.toUpperCase(), T[state][source],
        `${state}: --${name} mora biti tačan ${source}=${T[state][source]}`)
    }
    assert.match(tokens.get('font-aurum-serif') ?? '', /Palatino.*Georgia.*serif/)
  })
}

test('fontFamily.serif koristi samo sistemske fontove; nema vanjskih izvora', () => {
  assert.match(tailwindCode, /serif:\s*\[\s*'Palatino',\s*'Palatino Linotype',\s*'Book Antiqua',\s*'Georgia',\s*'serif',\s*\]/)
  assert.doesNotMatch(tailwindCode, /@import|https?:\/\/|fonts\.googleapis|@font-face/)
  assert.match(tailwindCode, /sans:\s*\[/, 'klasični sans stack ostaje')
})

test('check_ui_contrast.py mjeri 4 stanja i 4 nova NEJRA para po Aurum stanju', () => {
  for (const selector of [SELECTORS.light, SELECTORS.dark]) {
    assert.ok(contrastScript.includes(selector), `nedostaje ${selector} u kontrast skripti`)
  }
  assert.equal((contrastScript.match(/NEJRA §10: (text|muted|brand|accent) \/ page/g) ?? []).length, 4)
  assert.equal((contrastScript.match(/\("(aurum light|aurum dark|web light|web dark)",/g) ?? []).length, 4)
})

test('mutacije SSOT sinkronizacije se odbijaju (detektor nije prazna provjera)', () => {
  const guards = (srcCss) => {
    const block = cssBlockFor(srcCss, SELECTORS.light)
    if (!block) return false
    const tokens = vars(block)
    return ORDER.every((key) => tokens.get(`aurum-${key}`)?.toUpperCase() === T.light[key])
  }
  const cssBlockFor = (text, selector) => {
    const match = new RegExp(`${escapeRe(selector)}\\s*\\{([^{}]*)\\}`).exec(blankComments(text))
    return match ? match[1] : null
  }
  assert.equal(guards(globalsCss), true, 'CSS mora biti u sinku s NEJRA §10')
  const mutations = [
    ['--aurum-page: #FAF6EF;', '--aurum-page: #FAF6EE;'],
    ['--aurum-brand: #7A5A12;', '--aurum-brand: #7A5A13;'],
    ['--aurum-text: #1F1810;', '--aurum-text: #000000;'],
    ['[data-skin="aurum"][data-mode="light"] {', '[data-skin="aurum2"][data-mode="light"] {'],
  ]
  for (const [from, to] of mutations) {
    assert.ok(globalsCss.includes(from), `mutacija nije našla polazni tekst: ${from}`)
    assert.equal(guards(globalsCss.replace(from, to)), false, `mutacija nije uhvaćena: ${from}`)
  }
})
