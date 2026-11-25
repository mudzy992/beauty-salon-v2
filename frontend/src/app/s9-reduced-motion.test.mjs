import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'

/**
 * S9 — reduced motion u admin sadržaju i postavkama (2.3.3 / 2.5.4).
 *
 * Zahtjev vlasnika (2026-11-25): „unutar S9 možeš provjeriti motion i boje“.
 *
 * Zašto ovaj test postoji:
 *  - globalni `prefers-reduced-motion` blok u `globals.css` neutrališe
 *    `animation-duration` (0.01ms) i `transition-duration`, ali **ne** spriječava
 *    da ikona ostane rotirana u proizvoljnom uglu — `motion-reduce:animate-none`
 *    je `animation: none`, pa je spinner statički;
 *  - `transition-*` je već neutralisan globalno, ali `transition-all` je i dalje
 *    preširok (pokreće se na SVIM promjenama, ne samo na širini).
 *
 * Test ne traži „nema animacije“ (to bi ubilo i korisnički feedback), nego
 * traži da **svaka** animacija u S9 opsegu ima eksplicitnu reduced-motion
 * zaštitu, i da `transition-all` ne wrne.
 */

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

test('S9 opseg ima fajlove za provjeru (nijedna tvrdnja ne smije proći u praznini)', () => {
  assert.ok(FILES.length >= 20, `S9 opseg ima samo ${FILES.length} fajlova — scope se promijenio`)
  assert.ok(FILES.includes('src/pages/EmailSettings.tsx'))
  assert.ok(FILES.includes('src/features/gallery/gallery-category-list.tsx'))
})

test('svaka animacija u S9 opsegu ima reduced-motion zaštitu', () => {
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
    animationCount >= 25,
    `pronađeno samo ${animationCount} animacija u S9 opsegu — scope se promijenio`,
  )
})

test('nijedan `transition-all` u S9 opsegu (preširok je i pokreće se na svim promjenama)', () => {
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

test('S9 koristi isti obrazac zaštite kao S8 (`animate-spin motion-reduce:animate-none`)', () => {
  const source = readFileSync(new URL('src/pages/Salon.tsx', SRC), 'utf8')
  assert.match(source, /animate-spin motion-reduce:animate-none/)
})
