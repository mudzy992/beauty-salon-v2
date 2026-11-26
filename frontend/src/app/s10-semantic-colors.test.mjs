import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'

/**
 * S10 — semantički tokeni u stylist portalu (1.4.3 / 1.4.11).
 *
 * Zahtjev vlasnika (2026-11-25), nastavak S9 provjere boja na preostalim ekranima.
 *
 * Zašto ovaj test postoji:
 *  - hardkodirane Tailwind palete (`text-amber-700`, `bg-amber-50/60`, …) ne
 *    poznaju Aurum temu i imaju različit kontrast u svakoj od tri živih tema;
 *  - semantički tokeni (`text-warn-foreground`, `bg-warn`, …) imaju **izmjeren**
 *    kontrast u sve četiri kombinacije (web/Aurum × svijetlo/tamno) —
 *    `scripts/check_ui_contrast.py`.
 *
 * Izuzeci su **eksplicitni i obrazloženi** — svaki izuzetak je namjerni vizuelni
 * identitet (kontrola koja mora ostati bijela), a ne zaborav.
 */

/** Palete koje su čiste (numera) i koje nemaju semantički par. */
const RAW_PALETTE =
  /\b(?:text|bg|border|fill|from|to|via|ring|accent|outline|decoration|shadow)-(?:slate|gray|zinc|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-\d{2,3})?(?:\/\d{1,3})?\b/g

/**
 * Namjerni izuzeci — svaki sa razlogom.
 *
 * Trenutno **prazno**: nakon S10 remediacije nijedan fajl u opsegu ne koristi
 * sirovu paletu. Mapa ostaje jer (a) mehanizam mora biti testiran, i (b) svaki
 * budući izuzetak mora imati obrazloženje — prazna mapa znači „nema izuzetaka",
 * a ne „izuzetak se ne provjerava".
 *
 * 1. 2026-11-18 — `workbook-reschedule-preview-page.tsx`: dugme preklopnika je
 *    bilo `bg-white` (izuzetak zbog kontrasta kontrole preko track-a). Umjesto
 *    izuzetka, prebačeno na `bg-surface` — isti token kao zajednički Radix
 *    `Switch` thumb (`components/ui/switch.tsx`), pa je ponašanje u sve tri
 *    teme identično zajedničkom preklopniku i nije potrebno posebno opravdanje.
 */
const ALLOWED = new Map()

const S10_DIRECTORIES = [
  'src/features/stylist-portal',
  'src/features/stylist-workbook',
]

const S10_PAGES = [
  'src/layouts/StylistLayout.tsx',
  'src/layouts/stylist-nav.tsx',
  'src/layouts/stylist-user-menu.tsx',
]

const SRC = new URL('../../', import.meta.url)

/** Uklanjanje comment blokova — u njima su opisne palete, ne stvarni stilovi. */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1')
}

function s10Files() {
  const files = []
  const walk = (directory) => {
    let entries = []
    try {
      entries = readdirSync(new URL(`${directory}/`, SRC), { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        walk(`${directory}/${entry.name}`)
        continue
      }
      if (!entry.isFile()) continue
      if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) continue
      if (entry.name.includes('.test.')) continue
      files.push(`${directory}/${entry.name}`)
    }
  }
  for (const directory of S10_DIRECTORIES) walk(directory)
  return [...files, ...S10_PAGES]
}

const FILES = s10Files()

test('S10 opseg ima fajlove za provjeru (nijedna tvrdnja ne smije proći u praznini)', () => {
  assert.ok(FILES.length >= 20, `S10 opseg ima samo ${FILES.length} fajlova — scope se promijenio`)
  assert.ok(FILES.includes('src/features/stylist-portal/components/reservation-detail-actions.tsx'))
  assert.ok(FILES.includes('src/features/stylist-workbook/components/daily-log-disposition-panel.tsx'))
})

test('u S10 opsegu nema hardkodiranih Tailwind paleta (osim obrazloženih izuzetaka)', () => {
  const offenders = []
  for (const rel of FILES) {
    const source = stripComments(readFileSync(new URL(rel, SRC), 'utf8'))
    const found = [...new Set(source.match(RAW_PALETTE) ?? [])]
    if (found.length === 0) continue
    if (ALLOWED.has(rel)) continue
    offenders.push(`${rel}: ${found.join(', ')}`)
  }
  assert.deepEqual(
    offenders,
    [],
    'hardkodirane palete ne poznaju Aurum temu — koristi semantičke tokene ' +
      '(text-warn-foreground / bg-warn / border-line / bg-surface)',
  )
})

test('svaki izuzetak ima obrazloženje i izuzeti fajl stvarno koristi paletu', () => {
  for (const [rel, reason] of ALLOWED) {
    assert.ok(reason && reason.length > 20, `${rel}: izuzetak mora imati obrazloženje`)
    const source = stripComments(readFileSync(new URL(rel, SRC), 'utf8'))
    assert.match(source, new RegExp(RAW_PALETTE.source), `${rel}: izuzetak je nepotreban — paleta više nije korišćena`)
  }
})

test('semantički tokeni koje S10 koristi postoje u Tailwind konfiguraciji', () => {
  const config = readFileSync(new URL('tailwind.config.js', SRC), 'utf8')
  for (const token of ['ok', 'info', 'warn', 'bad', 'neutral', 'danger']) {
    assert.match(config, new RegExp(`\\b${token}:\\s*\\{`), `nema semantičkog sloja: ${token}`)
  }
  assert.match(config, /content:\s*\{\s*DEFAULT:\s*'hsl\(var\(--text\)\)'/, 'nema semantičkog sloja: content')
  assert.match(config, /surface:\s*\{\s*DEFAULT:\s*'hsl\(var\(--surface\)\)'/, 'nema semantičkog sloja: surface')
  assert.match(config, /\bline:\s*'hsl\(var\(--line\)\)'/, 'nema semantičkog sloja: line')
})

test('statusni tekstovi u S10 koriste semantičke tokene, ne `amber-*` / `rose-*`', () => {
  const actions = readFileSync(
    new URL('src/features/stylist-portal/components/reservation-detail-actions.tsx', SRC),
    'utf8',
  )
  assert.match(actions, /text-warn-foreground/)

  const summary = readFileSync(
    new URL('src/features/stylist-portal/components/reservation-detail-summary.tsx', SRC),
    'utf8',
  )
  assert.match(summary, /text-warn-foreground/)

  const disposition = readFileSync(
    new URL('src/features/stylist-workbook/components/daily-log-disposition-panel.tsx', SRC),
    'utf8',
  )
  assert.match(disposition, /bg-warn/)
  assert.match(disposition, /border-line/)
})

test('forced-colors: S10 ne uvodi tvrde granice, a globalni blok ostaje', () => {
  // 1.4.1 — u forced-colors stanju granice ne smiju zavisiti od pozadine.
  const css = readFileSync(new URL('src/styles/globals.css', SRC), 'utf8')
  assert.match(css, /@media \(forced-colors: active\)/, 'globalni forced-colors blok ne postoji')
  assert.match(css, /\.admin-shell input[\s\S]*?border: 1px solid CanvasText/, 'kontrole moraju imati CanvasText granicu')
  assert.match(css, /\.admin-shell \[aria-current='page'\][\s\S]*?outline: 2px solid Highlight/, 'trenutna stavka mora imati Highlight obris')

  // S10 ne smije dodati `forced-colors` izuzetke koji bi gasili globalni blok.
  for (const rel of FILES) {
    const source = stripComments(readFileSync(new URL(rel, SRC), 'utf8'))
    assert.doesNotMatch(
      source,
      /forced-colors:\s*active/,
      `${rel}: S10 ne smije uvoditi vlastiti forced-colors blok — globalni je jedini izvor istine`,
    )
  }
})
