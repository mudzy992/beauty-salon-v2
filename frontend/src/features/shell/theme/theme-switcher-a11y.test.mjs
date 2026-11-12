/**
 * `test:theme-switcher-a11y` — NEJRA §11/§12 + revidirani model: izbornik s 2 režima u Aurumu,
 * `aria-pressed`, `role="group"`, `role="status"`, 44 px mete, fokus ostaje,
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
  'shell.theme.announcement',
]

test('jedan role="group" s tačno 2 button[aria-pressed] i i18n imenom', () => {
  assert.equal((code.match(/role="group"/g) ?? []).length, 1)
  assert.match(code, /aria-label=\{t\('shell\.theme\.groupLabel'\)\}/)
  assert.equal((code.match(/aria-pressed=\{choice === option\.value\}/g) ?? []).length, 1,
    'aria-pressed se postavlja iz trenutnog stanja, ne hardkodirano')
  const choices = [...code.matchAll(/\{\s*value: '(classic|aurum-light|aurum-dark)',\s*labelKey: '([^']+)'\s*\}/g)]
  assert.deepEqual(choices.map((m) => m[1]), ['aurum-light', 'aurum-dark'])
  assert.match(code, /if \(skin === 'classic'\) return null/)
  assert.doesNotMatch(code, /value: 'classic'/)
  assert.deepEqual(choices.map((m) => m[2]), [
    'shell.theme.aurumLight', 'shell.theme.aurumDark',
  ])
  // Dva dugmeta u mapi, ne ručno kopirani markup blokovi.
  assert.equal((code.match(/<button/g) ?? []).length, 1)
  assert.match(code, /CHOICES\.map\(/, 'jedna petlja nad dva režima')
})

test('nijedan vidljivi natpis nije hard-kodiran; svi ključevi postoje u BS i EN', () => {
  for (const literal of ['Klasična', 'Aurum svijetla', 'Aurum tamna', 'Classic light', 'Aurum light', 'Aurum dark', 'Tema prikaza', 'Display theme']) {
    assert.equal(code.includes(literal), false, `hard-kodirani natpis: ${literal}`)
  }
  assert.match(code, /\{t\(option\.labelKey\)\}/, 'vidljivi tekst dolazi iz i18n')
  assert.match(code, /t\('shell\.theme\.announcement', \{ theme: t\(option\.labelKey\) \}\)/)
  for (const key of THEME_KEYS) {
    const valueBs = resolveKey(bs, key)
    const valueEn = resolveKey(en, key)
    assert.ok(typeof valueBs === 'string' && valueBs.length > 0, `BS nedostaje ${key}`)
    assert.ok(typeof valueEn === 'string' && valueEn.length > 0, `EN nedostaje ${key}`)
  }
  assert.match(resolveKey(bs, 'shell.theme.announcement'), /\{\{theme\}\}/)
  assert.match(resolveKey(en, 'shell.theme.announcement'), /\{\{theme\}\}/)
  // Strogi paritet novog `shell.theme` imenskog prostora.
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
  assert.match(code, /key=\{option\.value\}/, 'stabilni key → kliknuto dugme se ne remontira')
  // Nema vlastitog kretanja; globalni reduced-motion blok ostaje jedini vlasnik.
  assert.doesNotMatch(code, /transition-|animate-|animation:/)
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
    src.includes('role="group"'),
    src.includes("aria-label={t('shell.theme.groupLabel')}"),
    src.includes('aria-pressed={choice === option.value}'),
    src.includes('min-h-target min-w-target'),
    src.includes('role="status"'),
    src.includes('aria-live="polite"'),
    src.includes('{t(option.labelKey)}'),
  ].every(Boolean)
  assert.equal(guards(code), true, 'izvorni izbornik mora zadovoljiti sve ugovore')
  const mutations = [
    ['role="group"', 'role="menu"'],
    ['aria-pressed={choice === option.value}', 'aria-pressed="false"'],
    ['min-h-target min-w-target', 'min-h-6 min-w-6'],
    ['role="status"', 'role="note"'],
    ['{t(option.labelKey)}', 'Classic light'],
  ]
  for (const [from, to] of mutations) {
    assert.ok(code.includes(from), `mutacija nije našla polazni tekst: ${from}`)
    assert.equal(guards(code.replace(from, to)), false, `mutacija nije uhvaćena: ${from}`)
  }
})
