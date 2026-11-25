import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'

/**
 * S9 — semantički tokeni u admin sadržaju i postavkama (1.4.3 / 1.4.11).
 *
 * Zahtjev vlasnika (2026-11-25): „unutar S9 možeš provjeriti motion i boje“.
 *
 * Zašto ovaj test postoji:
 *  - hardkodirane Tailwind palete (`text-emerald-600`, `bg-rose-600`, …) ne
 *    poznaju Aurum temu i imaju različit kontrast u svakoj od tri živih tema;
 *  - semantički tokeni (`text-ok-foreground`, `text-danger`, `bg-warn`,
 *    `text-info-foreground`, `text-brand-rose-text`, …) imaju **izmjeren**
 *    kontrast u sve tri teme (`scripts/check_ui_contrast.py --strict`).
 *
 * Izuzeci su **eksplicitni i obrazloženi** — svaki izuzetak je namjerni vizuelni
 * identitet (preview emaila, preklap preko fotografije, native color picker),
 * a ne zaborav.
 */

/** Palete koje su čiste (numera) i koje nemaju semantički par. */
const RAW_PALETTE =
  /\b(?:text|bg|border|fill|from|to|via|ring|accent|outline|decoration|shadow)-(?:slate|gray|zinc|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-\d{2,3})?(?:\/\d{1,3})?\b/g

/**
 * Namjerni izuzeci — svaki sa razlogom.
 *
 *  1. `email-visual-editor-preview.tsx` — preview emaila mora izgledati **kao email**:
 *     boje su identične generatoru (`renderCampaignHtml`), pa je preview
 *     vjernost preporuka, a ne tema aplikacije.
 *  2. `gallery-image-grid.tsx` — preklap preko proizvoljne fotografije mora
 *     ostati tamni „scrim“ sa bijelim tekstom; Aurum override
 *     (`[data-skin="aurum"] [data-gallery-image-meta]`) ga ionako zamjenjuje
 *     površinom teme i `var(--text)` bojom.
 *  3. `setting-editor-field.tsx` — native `<input type="color">` swatch ostaje
 *     bijel (kontrast kontrole, nije površina teme) — već napomenuto u kodu.
 */
const ALLOWED = new Map([
  [
    'src/features/email-settings/email-visual-editor-preview.tsx',
    'preview emaila mora biti vjeran izvornom emailu (boje = renderCampaignHtml)',
  ],
  [
    'src/features/gallery/gallery-image-grid.tsx',
    'preklap preko fotografije: scrim + bijeli tekst; Aurum override ga zamjenjuje',
  ],
  [
    'src/features/settings/setting-editor-field.tsx',
    'native <input type="color"> swatch ostaje bijel (kontrast kontrole)',
  ],
])

const S9_DIRECTORIES = [
  'src/features/gallery',
  'src/features/reviews',
  'src/features/blog',
  'src/features/content',
  'src/features/email-settings',
  'src/features/notifications',
  'src/features/app-releases',
  'src/features/settings',
]

const S9_PAGES = [
  'src/pages/Blog.tsx',
  'src/pages/Gallery.tsx',
  'src/pages/Reviews.tsx',
  'src/pages/SettingsHub.tsx',
  'src/pages/Settings.tsx',
  'src/pages/SettingsOperations.tsx',
  'src/pages/SettingsAppearance.tsx',
  'src/pages/SettingsSeo.tsx',
  'src/pages/AppReleases.tsx',
  'src/pages/Notifications.tsx',
  'src/pages/EmailSettings.tsx',
]

const SRC = new URL('../../', import.meta.url)

function s9Files() {
  const files = []
  for (const directory of S9_DIRECTORIES) {
    let entries = []
    try {
      entries = readdirSync(new URL(`${directory}/`, SRC), { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (!entry.isFile()) continue
      if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) continue
      if (entry.name.includes('.test.')) continue
      files.push(`${directory}/${entry.name}`)
    }
  }
  return [...files, ...S9_PAGES]
}

const FILES = s9Files()

/** Uklanjanje comment blokova — u njima su opisne palete, ne stvarni stilovi. */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1')
}

test('S9 opseg ima fajlove za provjeru (nijedna tvrdnja ne smije proći u praznini)', () => {
  assert.ok(FILES.length >= 20, `S9 opseg ima samo ${FILES.length} fajlova — scope se promijenio`)
  assert.ok(FILES.includes('src/pages/EmailSettings.tsx'))
  assert.ok(FILES.includes('src/features/blog/blog-posts-table.tsx'))
})

test('u S9 opsegu nema hardkodiranih Tailwind paleta (osim obrazloženih izuzetaka)', () => {
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
      '(text-ok-foreground / text-danger / bg-warn / text-info-foreground / text-brand-rose-text)',
  )
})

test('svaki izuzetak ima obrazloženje i izuzeti fajl stvarno koristi paletu', () => {
  for (const [rel, reason] of ALLOWED) {
    assert.ok(reason && reason.length > 20, `${rel}: izuzetak mora imati obrazloženje`)
    const source = stripComments(readFileSync(new URL(rel, SRC), 'utf8'))
    // globalni regex drži `lastIndex` — za `assert.match` se pravi novi.
    assert.match(source, new RegExp(RAW_PALETTE.source), `${rel}: izuzetak je nepotreban — paleta više nije korišćena`)
  }
})

test('semantički tokeni koje S9 koristi postoje u Tailwind konfiguraciji', () => {
  const config = readFileSync(new URL('tailwind.config.js', SRC), 'utf8')
  for (const token of ['ok', 'info', 'warn', 'bad', 'neutral', 'danger']) {
    assert.match(config, new RegExp(`\\b${token}:\\s*\\{`), `nema semantičkog sloja: ${token}`)
  }
  // Jednostavni tokeni (`content`, `surface`, `line`) su ključevi sa vrijednošću.
  assert.match(config, /content:\s*\{\s*DEFAULT:\s*'hsl\(var\(--text\)\)'/, 'nema semantičkog sloja: content')
  assert.match(config, /surface:\s*\{\s*DEFAULT:\s*'hsl\(var\(--surface\)\)'/, 'nema semantičkog sloja: surface')
  assert.match(config, /\bline:\s*'hsl\(var\(--line\)\)'/, 'nema semantičkog sloja: line')
  assert.match(config, /'rose-text'/)
  assert.match(config, /'gold-text'/)
})

test('statusni tekstovi u S9 koriste semantičke tokene, ne `emerald-600` / `rose-600`', () => {
  const blogPosts = readFileSync(new URL('src/features/blog/blog-posts-table.tsx', SRC), 'utf8')
  assert.match(blogPosts, /text-ok-foreground/)
  assert.match(blogPosts, /text-danger/)
  assert.match(blogPosts, /text-info-foreground/)

  const comments = readFileSync(new URL('src/features/blog/blog-comments-dialog.tsx', SRC), 'utf8')
  assert.match(comments, /text-ok-foreground/)
  assert.match(comments, /text-danger/)
  assert.match(comments, /bg-warn/)

  const reviews = readFileSync(new URL('src/features/reviews/reviews-table.tsx', SRC), 'utf8')
  assert.match(reviews, /text-ok-foreground/)
  assert.match(reviews, /text-danger/)
})
