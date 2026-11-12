import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8')

const adminLayout = read('./admin/admin-layout.tsx')
const stylistLayout = read('../../layouts/StylistLayout.tsx')
const adminNav = read('./admin/admin-nav-menu.tsx')
const skipLink = read('./admin/ui/skip-link.tsx')
const dashboardTitles = read('../../seo/dashboard-titles.ts')
const bs = JSON.parse(read('../../i18n/locales/bs.json'))
const en = JSON.parse(read('../../i18n/locales/en.json'))

const resolveKey = (locale, key) =>
  key.split('.').reduce((acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), locale)

test('skip link is the first focusable element of both dashboard shells', () => {
  for (const source of [adminLayout, stylistLayout]) {
    assert.match(source, /<SkipLink targetId="main" \/>/)
  }
  assert.match(skipLink, /className="skip-link"/)
  assert.match(skipLink, /t\('shell\.skipToContent'\)/)
})

test('main landmark of both shells is the skip link target and programmatically focusable', () => {
  for (const source of [adminLayout, stylistLayout]) {
    assert.match(source, /<main id="main" tabIndex=\{-1\}/)
    assert.match(source, /useFocusOnNavigate\(\)/)
  }
})

test('navigation links expose their current-page state', () => {
  assert.match(adminNav, /aria-current=\{active \? 'page' : undefined\}/)
  assert.match(stylistLayout, /aria-current=\{active \? 'page' : undefined\}/)
})

test('each shell has exactly one named main navigation landmark', () => {
  assert.equal((adminNav.match(/<nav/g) ?? []).length, 1)
  assert.match(adminNav, /aria-label=\{t\('shell\.mainNavigation'\)\}/)
  assert.equal((stylistLayout.match(/<nav/g) ?? []).length, 1)
  assert.match(stylistLayout, /aria-label=\{t\('shell\.mainNavigation'\)\}/)
})

test('help is reachable from a consistent place in both shells (WCAG 3.2.6)', () => {
  // 3.2.6 Consistent Help ne trazi da pomoc POSTOJI — trazi da se, ako postoji,
  // nalazi na ISTOM relativnom mjestu na svakoj stranici istog seta. Pomoc je u
  // dijeljenom layoutu, pa je time na istom mjestu na svakoj stranici seta.
  //
  // Mjerenje 2026-11-09: oba shell-a vec imaju /kontakt + HelpCircle, i to na istom
  // relativnom mjestu (odmah prije korisnickog menija). Matrica je tvrdila "nema
  // help elementa u shellu" i drzala 3.2.6 kao ❌ — to je bilo pogresno.
  const SHELLS = [
    ['admin', adminLayout, '<AdminUserMenu'],
    ['stylist', stylistLayout, '<DropdownMenu>'],
  ]

  for (const [name, source, userMenuAnchor] of SHELLS) {
    const help = source.indexOf('to="/kontakt"')
    assert.ok(help > -1, `${name}: shell mora imati link na /kontakt`)

    // Pristupacno ime: ikona je dekorativna, tekst je sr-only.
    const block = source.slice(help, source.indexOf('</Link>', help))
    assert.match(block, /<HelpCircle aria-hidden/, `${name}: HelpCircle mora biti aria-hidden`)
    assert.match(
      block,
      /<span className="sr-only">\{t\('shell\.help'\)\}<\/span>/,
      `${name}: link mora imati tekstualno ime iz shell.help`,
    )
    assert.match(block, /min-h-target min-w-target/, `${name}: meta od 44px za dodir`)

    // Pomoc mora biti u dijeljenom <header> — to je ono sto garantuje isto mjesto
    // na svakoj stranici seta, jer se layout ne mijenja po ruti.
    const headerStart = source.indexOf('<header')
    const headerEnd = source.indexOf('</header>')
    assert.ok(headerStart > -1 && headerEnd > headerStart, `${name}: header mora postojati`)
    assert.ok(
      help > headerStart && help < headerEnd,
      `${name}: link za pomoc mora biti unutar dijeljenog <header>`,
    )

    // Relativni redoslijed: pomoc PRIJE korisnickog menija, u oba shell-a.
    const userMenu = source.indexOf(userMenuAnchor, headerStart)
    assert.ok(userMenu > -1, `${name}: nije nadjen anchor korisnickog menija u headeru`)
    assert.ok(
      help < userMenu,
      `${name}: pomoc mora biti prije korisnickog menija (3.2.6 isti relativni redoslijed)`,
    )
  }

  // Kljuc postoji u oba jezika (inace bi ime bilo prazno).
  assert.ok(resolveKey(bs, 'shell.help'), 'bs shell.help')
  assert.ok(resolveKey(en, 'shell.help'), 'en shell.help')
})

test('forced-colors rules are scoped to the dashboard shells only', () => {
  for (const source of [adminLayout, stylistLayout]) {
    assert.match(source, /className="admin-shell /)
  }
})

test('every dashboard page title key exists in both locales', () => {
  const keys = [...dashboardTitles.matchAll(/key: '([^']+)'/g)].map(([, key]) => key)
  assert.ok(keys.length >= 30, `expected at least 30 route title keys, found ${keys.length}`)
  assert.ok(!keys.some((key) => key.includes(' ')), 'title keys must be i18n keys, not literals')

  for (const key of keys) {
    assert.ok(typeof resolveKey(bs, key) === 'string' && resolveKey(bs, key).length > 0, `missing BS: ${key}`)
    assert.ok(typeof resolveKey(en, key) === 'string' && resolveKey(en, key).length > 0, `missing EN: ${key}`)
  }
})

// S6: approved navigation grouping and standalone calendar shell contract.
import './admin/s6-presentation.test.mjs'

test('stylist icons are decorative and preserve the five labelled routes', () => {
  const paths = [...stylistLayout.matchAll(/\{ path: '(\/stylist\/[^']+)', labelKey:/g)].map(([, path]) => path)
  assert.deepEqual(paths, ['/stylist/inbox', '/stylist/workbook', '/stylist/schedule', '/stylist/debts', '/stylist/stats'])
  for (const path of paths) assert.ok(stylistLayout.includes(`'${path}':`))
  assert.match(stylistLayout, /<Icon data-aurum-nav-icon aria-hidden="true"/)
  assert.match(stylistLayout, /\{t\(item.labelKey\)\}/)
})

test('auth card header uses configured logo and retains both switchers', () => {
  const header = read('../auth/auth-card-header.tsx')
  assert.match(header, /getSetting\('app_logo', ''\)/)
  assert.match(header, /getSetting\('app_title', t\('app.title'\)\)/)
  assert.match(header, /<UploadedBrandLogo/)
  assert.match(header, /<AppLogo/)
  assert.match(header, /<ThemeSwitcher \/>/)
  assert.match(header, /<LanguageSwitcher \/>/)
})
