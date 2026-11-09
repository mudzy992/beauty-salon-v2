import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const routes = read('../../app/routes/admin.routes.tsx')
const hub = read('../../pages/SettingsHub.tsx')
const tabNav = read('./settings-tab-nav.tsx')
const redirect = read('../shell/admin/tab-redirect.tsx')
const nav = read('../shell/admin/admin-nav.ts')
const navMenu = read('../shell/admin/admin-nav-menu.tsx')
const layout = read('../shell/admin/admin-layout.tsx')
const bs = JSON.parse(read('../../i18n/locales/bs.json'))
const en = JSON.parse(read('../../i18n/locales/en.json'))

// ---------------------------------------------------------------------------
// Faza 10 — M2 (Q3): /admin/settings hub sa ?tab=, stare rute redirectuju.
// Q3: „Sve stare rute ostaju <Navigate replace>, ?tab= i postojeći query
// parametri rade."
// ---------------------------------------------------------------------------

const TABS = ['site', 'operations', 'appearance', 'seo', 'email', 'notifications', 'releases']

test('svih 7 tabova postoji i pokriveni su i18n ključevima', () => {
  for (const tab of TABS) {
    assert.match(tabNav, new RegExp(`'${tab}',`), `settings-tab-nav: nedostaje tab ${tab}`)
    for (const [name, locale] of [['bs', bs], ['en', en]]) {
      assert.equal(typeof locale.adminSettings.nav[tab], 'string', `${name}: adminSettings.nav.${tab}`)
      assert.equal(typeof locale.adminSettings.navDescriptions[tab], 'string',
        `${name}: adminSettings.navDescriptions.${tab}`)
    }
  }
  assert.match(tabNav, /export const isSettingsTab = \(value: string \| null\): value is SettingsTab/)
})

test('stare rute redirectuju na hub umjesto da renderuju stranicu', () => {
  const expected = {
    'settings/operations': 'operations',
    'settings/appearance': 'appearance',
    'settings/seo': 'seo',
    'app-releases': 'releases',
    notifications: 'notifications',
    'email-settings': 'email',
  }
  for (const [path, tab] of Object.entries(expected)) {
    const re = new RegExp(
      `\\{ path: '${path.replace(/\//g, '\\/')}', element: <TabRedirect to="/admin/settings" tab="${tab}" /> \\}`,
    )
    assert.match(routes, re, `ruta '${path}' ne redirectuje na ?tab=${tab}`)
  }
  assert.match(routes, /\{ path: 'settings', element: <SettingsHub \/> \}/)
})

test('redirect ČUVA postojeće query parametre (Q3)', () => {
  // Običan <Navigate to="…?tab=x"> bi odbacio ?userId=… / ?stylistId=…
  assert.match(redirect, /const next = new URLSearchParams\(searchParams\)/)
  assert.match(redirect, /next\.set\('tab', tab\)/)
  assert.match(redirect, /<Navigate to=\{`\$\{to\}\?\$\{next\.toString\(\)\}`\} replace \/>/)
  assert.equal(/to=\{`\$\{to\}\?tab=\$\{tab\}`\}/.test(redirect), false,
    'redirect ne smije prepisati cijeli query string')
})

test('hub dispatch-uje na ?tab= s fallback-om na zadani tab', () => {
  assert.match(hub, /const tab: SettingsTab = isSettingsTab\(requested\) \? requested : 'site'/)
  for (const tab of TABS) {
    assert.match(hub, new RegExp(`${tab}: \\{ Component:`), `hub: nedostaje panel ${tab}`)
  }
  // tri ne-settings taba imaju sopstveni layout, pa im hub dodaje nav
  for (const tab of ['email', 'notifications', 'releases']) {
    assert.match(hub, new RegExp(`${tab}: \\{ Component: \\w+, wrap: true \\}`), `${tab} mora biti wrap: true`)
  }
  for (const tab of ['site', 'operations', 'appearance', 'seo']) {
    assert.match(hub, new RegExp(`${tab}: \\{ Component: \\w+, wrap: false \\}`), `${tab} mora biti wrap: false`)
  }
  // lazy je obavezan: EmailSettings ima 1377 linija
  assert.equal((hub.match(/lazy\(\(\) => import\(/g) ?? []).length, 7, 'svih 7 panela mora biti lazy')
  assert.match(hub, /<Suspense fallback=\{<RouteLoadingFallback \/>\}>/)
})

test('aktivno stanje sidebar-a gleda ?tab=, ne samo pathname', () => {
  // 4 sistemske stavke sada dijele /admin/settings
  assert.equal((nav.match(/path: '\/admin\/settings'/g) ?? []).length, 4)
  assert.match(nav, /tab: 'site', tabDefault: true/)
  for (const tab of ['releases', 'notifications', 'email']) {
    assert.match(nav, new RegExp(`tab: '${tab}'`), `admin-nav: nedostaje tab ${tab}`)
  }
  assert.match(nav, /searchTab\?: string \| null,/)
  assert.match(nav, /if \(item\.tabDefault\) return !searchTab \|\| searchTab === item\.tab/)
  assert.match(navMenu, /new URLSearchParams\(search \?\? ''\)\.get\('tab'\)/)
  assert.match(navMenu, /isAdminNavItemActive\(pathname, item, searchTab\)/)
  assert.match(navMenu, /key=\{adminNavItemHref\(item\)\}/, 'key ne smije biti item.path (duplikati)')
  assert.match(navMenu, /to=\{adminNavItemHref\(item\)\}/)
  assert.match(layout, /search=\{location\.search\}/)
})

test('zadani tab nema ?tab= u URL-u (kao finance-page)', () => {
  assert.match(tabNav, /tab === 'site' \? '\/admin\/settings' : `\/admin\/settings\?tab=\$\{tab\}`/)
})

test('moduli ostaju u svojim fajlovima jer ih testovi čitaju po putanji', () => {
  // 13 testova čita pages/Settings*.tsx, Notifications.tsx, EmailSettings.tsx,
  // AppReleases.tsx i asertuje njihov sadržaj — hub ih samo importuje.
  for (const f of ['Settings', 'SettingsOperations', 'SettingsAppearance', 'SettingsSeo',
    'EmailSettings', 'Notifications', 'AppReleases']) {
    assert.match(hub, new RegExp(`import\\('\\./${f}'\\)`), `hub mora importovati ./${f}`)
    const src = read(`../../pages/${f}.tsx`)
    assert.ok(src.length > 500, `pages/${f}.tsx ne smije biti ispražnjen (${src.length} B)`)
  }
})
