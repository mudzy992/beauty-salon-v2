import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'

/**
 * S10 — reduced motion u stylist portalu (2.3.3 / 2.5.4).
 *
 * Zahtjev vlasnika (2026-11-25), nastavak S9 provjere motiona na preostalim ekranima.
 *
 * Zašto ovaj test postoji:
 *  - globalni `prefers-reduced-motion` blok u `globals.css` neutrališe
 *    `animation-duration` (0.01ms) i `transition-duration`, ali **ne** spriječava
 *    da ikona ostane rotirana u proizvoljnom uglu — `motion-reduce:animate-none`
 *    je `animation: none`, pa je spinner statički;
 *  - stylist portal ima 11 spinera (radna knjiga: detalj 4, novi unos 3,
 *    reschedule preview 4) i nijedan nije bio zaštićen.
 *
 * Test ne traži „nema animacije“ (to bi ubilo i korisnički feedback), nego da
 * **svaka** animacija u S10 opsegu ima eksplicitnu reduced-motion zaštitu.
 */

const S10_DIRECTORIES = [
  'src/features/stylist-portal',
  'src/features/stylist-workbook',
]

const S10_PAGES = [
  'src/layouts/StylistLayout.tsx',
  'src/layouts/stylist-nav.tsx',
  'src/layouts/stylist-user-menu.tsx',
]

/** Korijen paketa (`frontend/`) — putanje u opsegu su relativne na njega. */
const SRC = new URL('../../', import.meta.url)

/** Izvlači `className` izraze (string, template literal i `{...}`) iz izvora. */
function classNameExpressions(source) {
  const expressions = []
  const pattern = /className=(?:"([^"]*)"|\{`([^`]*)`\}|\{((?:[^{}]|\{[^{}]*\})*)\})/g
  for (const match of source.matchAll(pattern)) {
    expressions.push(match[1] ?? match[2] ?? match[3] ?? '')
  }
  return expressions
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
  assert.ok(FILES.includes('src/features/stylist-workbook/pages/workbook-new-entry-page.tsx'))
  assert.ok(FILES.includes('src/features/stylist-portal/pages/stylist-inbox-page.tsx'))
  assert.ok(FILES.includes('src/layouts/StylistLayout.tsx'))
})

test('svaka animacija u S10 opsegu ima reduced-motion zaštitu', () => {
  const unprotected = []
  let animationCount = 0
  for (const rel of FILES) {
    const source = readFileSync(new URL(rel, SRC), 'utf8')
    for (const expression of classNameExpressions(source)) {
      // `motion-reduce:animate-none` je zaštita, a ne animacija.
      const animations = expression.match(/(?<!motion-reduce:)\banimate-[a-z0-9-]+/g) ?? []
      if (animations.length === 0) continue
      animationCount += animations.length
      if (!expression.includes('motion-reduce:animate-none')) {
        const line = source.slice(0, source.indexOf(expression)).split('\n').length
        unprotected.push(`${rel}:${line} → ${expression.trim().slice(0, 90)}`)
      }
    }
  }
  assert.deepEqual(
    unprotected,
    [],
    'animacije bez `motion-reduce:animate-none` (spiner ostaje rotiran pod prefers-reduced-motion)',
  )
  assert.ok(
    animationCount >= 10,
    `pronađeno samo ${animationCount} animacija u S10 opsegu — scope se promijenio`,
  )
})

test('nijedan `transition-all` u S10 opsegu (preširok je i pokreće se na svim promjenama)', () => {
  const offenders = []
  for (const rel of FILES) {
    const source = readFileSync(new URL(rel, SRC), 'utf8')
    if (/transition-all\b/.test(source)) offenders.push(rel)
  }
  assert.deepEqual(offenders, [], '`transition-all` se zamjenjuje ciljanim `transition-[property]`')
})

test('globalni prefers-reduced-motion blok postoji i neutrališe animacije i tranzicije', () => {
  const css = readFileSync(new URL('src/styles/globals.css', SRC), 'utf8')
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/)
  assert.match(css, /animation-duration:\s*0\.01ms\s*!important/)
  assert.match(css, /animation-iteration-count:\s*1\s*!important/)
  assert.match(css, /transition-duration:\s*0\.01ms\s*!important/)
})

test('S10 koristi isti obrazac zaštite kao S8/S9 (`animate-spin motion-reduce:animate-none`)', () => {
  const source = readFileSync(
    new URL('src/features/stylist-workbook/pages/workbook-detail-page.tsx', SRC),
    'utf8',
  )
  assert.match(source, /animate-spin motion-reduce:animate-none/)
})
