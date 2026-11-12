/**
 * `test:theme-switcher-a11y` — jedno dugme za 2 režima u Aurumu,
 * stabilno ime, `aria-pressed`, `role="status"`, 44 px meta, fokus ostaje,
 * svi natpisi kroz i18n, isto relativno mjesto u 3 shella. Source-contract stil
 * (nema browsera u sandboxu) + mutacijske provjere da detektor nije prazan.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8')
const blankComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (_m, p1) => p1)

const switcher = read('./theme-switcher.tsx')
const code = blankComments(switcher)
const providers = read('../../../app/providers.tsx')
const publicLayout = read('../public/public-layout.tsx')
const adminChrome = read('../admin/admin-chrome.tsx')
const stylistLayout = read('../../../layouts/StylistLayout.tsx')
const adminLayout = read('../admin/admin-layout.tsx')
const globalsCss = read('../../../styles/globals.css')
const indexHtml = read('../../../../index.html')
const bs = JSON.parse(read('../../../i18n/locales/bs.json'))
const en = JSON.parse(read('../../../i18n/locales/en.json'))

const resolveKey = (locale, key) =>
  key.split('.').reduce((acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), locale)

const THEME_KEYS = [
  'shell.theme.groupLabel',
  'shell.theme.classic',
  'shell.theme.aurumLight',
  'shell.theme.aurumDark',
  'shell.theme.darkToggle',
  'shell.theme.announcement',
]

test('jedno dugme ima stabilno ime i stanje, skriva se u classic i mijenja režim', () => {
  assert.equal((code.match(/<button/g) ?? []).length, 1)
  assert.match(code, /aria-label=\{t\('shell\.theme\.darkToggle'\)\}/)
  assert.match(code, /aria-pressed=\{isDark\}/)
  assert.match(code, /const isDark = choice === 'aurum-dark'/)
  assert.match(code, /const next = isDark \? 'aurum-light' : 'aurum-dark'/)
  assert.match(code, /setChoice\(next\)/)
  assert.match(code, /if \(skin === 'classic'\) return null/)
  assert.match(code, /<Sun aria-hidden="true"/)
  assert.match(code, /<Moon aria-hidden="true"/)
})

test('pristupačno ime i najave dolaze iz BS i EN resursa', () => {
  assert.match(code, /t\('shell\.theme\.announcement'/)
  assert.match(code, /t\(isDark \? 'shell\.theme\.aurumLight' : 'shell\.theme\.aurumDark'\)/)
  for (const key of THEME_KEYS) {
    for (const locale of [bs, en]) assert.ok(typeof resolveKey(locale, key) === 'string' && resolveKey(locale, key).length > 0, `missing ${key}`)
  }
  assert.match(resolveKey(bs, 'shell.theme.announcement'), /\{\{theme\}\}/)
  assert.match(resolveKey(en, 'shell.theme.announcement'), /\{\{theme\}\}/)
  assert.deepEqual(Object.keys(bs.shell.theme).sort(), Object.keys(en.shell.theme).sort())
  assert.deepEqual(Object.keys(bs.shell.theme).sort(), THEME_KEYS.map((k) => k.split('.').pop()).sort())
})

test('44 px mete, role="status" najava, fokus ostaje, bez otimanja fokusa', () => {
  assert.match(code, /min-h-target min-w-target/, '2.5.8: meta od 44 px')
  assert.match(code, /focus-visible:ring-2 focus-visible:ring-focus-ring/, 'vidljiv fokus')
  assert.equal((code.match(/role="status"/g) ?? []).length, 1)
  assert.match(code, /aria-live="polite"/)
  assert.match(code, /setAnnouncement\(/)
  assert.doesNotMatch(code, /autoFocus|\.focus\(\)|document\.activeElement|tabIndex=/)
  assert.doesNotMatch(code, /<button[^>]*key=/, 'dugme ostaje stabilno pri promjeni')
  assert.match(globalsCss, /\.theme-switcher-icon \{[^}]*animation:/)
  assert.match(globalsCss, /prefers-reduced-motion: reduce[\s\S]*?\.theme-switcher-icon \{ animation: none;/)
  assert.match(
    globalsCss,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\*,\s*\*::before,\s*\*::after\s*\{/,
  )
})

test('ThemeSwitcher je u javnom (desktop + drawer), admin i stylist headeru', () => {
  assert.equal((publicLayout.match(/<ThemeSwitcher\s*\/>/g) ?? []).length, 2,
    'javni desktop header + mobilni drawer')
  assert.equal((adminChrome.match(/<ThemeSwitcher\s*\/>/g) ?? []).length, 1)
  assert.equal((stylistLayout.match(/<ThemeSwitcher\s*\/>/g) ?? []).length, 1)
  for (const source of [publicLayout, adminChrome, stylistLayout]) {
    assert.match(source, /import \{ ThemeSwitcher \}/)
  }
  // Ne dodaje drugi <nav> landmark (test:shell-a11y traži tačno jedan po shellu).
  assert.equal((code.match(/<nav[\s>]/g) ?? []).length, 0)
  // 3.2.6: pomoć i dalje prije korisničkog menija u oba dashboard shella.
  const helpAdmin = adminLayout.indexOf('to="/kontakt"')
  const userAdmin = adminLayout.indexOf('<AdminUserMenu', adminLayout.indexOf('<header'))
  assert.ok(helpAdmin > -1 && userAdmin > helpAdmin, 'admin: pomoć mora ostati prije menija')
  const helpStylist = stylistLayout.indexOf('to="/kontakt"')
  const userStylist = stylistLayout.indexOf('<DropdownMenu>')
  assert.ok(helpStylist > -1 && userStylist > helpStylist, 'stylist: pomoć mora ostati prije menija')
})

test('runtime ugovor: ThemeProvider iznad SettingsProvider i meta theme-color', () => {
  const theme = providers.indexOf('<ThemeProvider>')
  const settings = providers.indexOf('<SettingsProvider>')
  assert.ok(theme > -1 && settings > theme, 'SettingsContext mora moći čitati useTheme()')
  assert.match(providers, /<MotionConfig reducedMotion="user">/)
  assert.match(indexHtml, /<meta name="theme-color" content="#0f172a" \/>/,
    'početna vrijednost ostaje; runtime je održava')
})

test('mutacije a11y ugovora se odbijaju (detektor nije prazna provjera)', () => {
  const guards = (src) => [
    src.includes("aria-label={t('shell.theme.darkToggle')}"),
    src.includes('aria-pressed={isDark}'),
    src.includes('min-h-target min-w-target'),
    src.includes('role="status"'),
    src.includes('aria-live="polite"'),
    src.includes("const next = isDark ? 'aurum-light' : 'aurum-dark'"),
    src.includes('aria-hidden="true"'),
  ].every(Boolean)
  assert.equal(guards(code), true)
  const mutations = [
    ["aria-label={t('shell.theme.darkToggle')}", ''],
    ['aria-pressed={isDark}', 'aria-pressed="false"'],
    ['min-h-target min-w-target', 'min-h-6 min-w-6'],
    ['role="status"', 'role="note"'],
    ["const next = isDark ? 'aurum-light' : 'aurum-dark'", "const next = 'aurum-light'"],
  ]
  for (const [from, to] of mutations) {
    assert.ok(code.includes(from))
    assert.equal(guards(code.replace(from, to)), false, `mutacija nije uhvaćena: ${from}`)
  }
})
