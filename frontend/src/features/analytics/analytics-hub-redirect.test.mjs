/**
 * Faza 6 — M1 / Q7 (odgovori od 2026-11-08): analitika postaje jedna ruta s tabovima
 *
 *   /admin/analytics?tab=overview   (default, bez ?tab=)
 *   /admin/analytics?tab=clients    ← /admin/client-analytics
 *   /admin/analytics?tab=stylists   ← /admin/stylist-analytics
 *
 * Ugovor koji čuva M1:
 *  - tab definicije i aktivno stanje (3 taba, `aria-current`, default bez ?tab=)
 *  - kod-splitting hub-a (lazy + Suspense) — ClientAnalytics.tsx je 764 linije
 *  - stare rute redirectuju i **čuvaju** `userId` / `stylistId` / `fromDate` / `toDate`
 *  - nijedan deep link u aplikaciji ne vodi na staru rutu
 *  - **2.4.2**: naslov dokumenta mora pratiti tab — `dashboardTitleKey` se **izvršava**
 *    (esbuild bundle, ne regex nad izvorom), jer naslov je jedini signal za čitača ekrana
 *  - moduli ostaju netaknuti u `pages/` (čitaju ih 13 testova po putanji)
 *
 * Bez browsera: izvorni ugovor + izvršavanje čiste logike naslova.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { test } from 'node:test'
import { tmpdir } from 'node:os'
import { build } from 'esbuild'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const at = (p) => readFileSync(join(root, p), 'utf8')

const tabNav = at('features/analytics/analytics-tab-nav.tsx')
const hub = at('pages/AnalyticsHub.tsx')
const routes = at('app/routes/admin.routes.tsx')
const seo = at('seo/SeoRouteDefaults.tsx')

/** Rekursivno sve datoteke u src/ (bez testova). */
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory()
      ? walk(full)
      : full.endsWith('.test.mjs') || full.endsWith('.test.tsx')
        ? []
        : [full]
  })
const SRC = walk(root)
const rel = (p) => p.slice(root.length + 1).replace(/\\/g, '/')

test('ANALYTICS_TABS: 3 taba, default `overview` bez ?tab=, eksplicitno aria-current', () => {
  assert.match(tabNav, /export const ANALYTICS_TABS = \['overview', 'clients', 'stylists'\] as const/)
  assert.match(tabNav, /export type AnalyticsTab = \(typeof ANALYTICS_TABS\)\[number\]/)
  assert.match(tabNav, /export const isAnalyticsTab = \(value: string \| null\): value is AnalyticsTab =>/)
  assert.match(tabNav, /const ICONS = \{ overview: BarChart3, clients: User, stylists: TrendingUp \} as const/)

  // default se ne smije pisati u URL (isto pravilo kao finance-page.tsx)
  assert.match(tabNav, /tab === 'overview' \? '\/admin\/analytics' : `\/admin\/analytics\?tab=\$\{tab\}`/)
  assert.match(tabNav, /aria-current=\{isActive \? 'page' : undefined\}/)
  // 2.5.5 / 2.4.7: ciljna velicina i focus-ring na samoj referenci, ne na wrapperu
  const link = tabNav.slice(tabNav.indexOf('<Link'))
  assert.match(link, /min-h-target/)
  assert.match(link, /px-3 py-2/)
  assert.match(link, /focus-visible:ring-focus-ring/)
  assert.match(link, /aria-hidden="true" \/>/)
  assert.match(tabNav, /aria-label=\{t\('adminAnalytics\.tabsLabel'\)\}/)
})

test('AnalyticsHub: lazy + Suspense za sva tri panela (code-splitting očuvan)', () => {
  for (const page of ['Analytics', 'ClientAnalytics', 'StylistAnalytics']) {
    assert.match(hub, new RegExp(`const ${page} = lazy\\(\\(\\) => import\\('\\./${page}'\\)\\)`))
  }
  assert.match(hub, /import \{ RouteLoadingFallback \} from '\.\.\/app\/route-loading-fallback'/)
  assert.match(hub, /<Suspense fallback=\{<RouteLoadingFallback \/>\}>/)
  // `sp.get('tab')!` bi proširio tip na string i slomio PANELS[tab] (TS7053)
  assert.match(hub, /const tab: AnalyticsTab = isAnalyticsTab\(requested\) \? requested : 'overview'/)
  assert.match(hub, /export default function AnalyticsHub\(\)/)
})

test('admin.routes: /admin/analytics → hub; stare rute → TabRedirect s ?tab=', () => {
  assert.match(routes, /const AnalyticsHub = lazy\(\(\) => import\('\.\.\/\.\.\/pages\/AnalyticsHub'\)\)/)
  assert.match(routes, /\{ path: 'analytics', element: <AnalyticsHub \/> \},/)
  // stare rute vise nemaju sopstveni element
  assert.match(routes, /\{ path: 'client-analytics', element: <TabRedirect to="\/admin\/analytics" tab="clients" \/> \},/)
  assert.match(routes, /\{ path: 'stylist-analytics', element: <TabRedirect to="\/admin\/analytics" tab="stylists" \/> \},/)
  assert.doesNotMatch(routes, /lazy\(\(\) => import\('\.\.\/\.\.\/pages\/(Analytics|ClientAnalytics|StylistAnalytics)'\)\)/)
})

test('nijedan deep link u aplikaciji ne vodi na staru analitiku', () => {
  const stale = SRC.filter((f) => {
    const s = readFileSync(f, 'utf8')
    // definicija redirect rute smije spominjati stare putanje (kao string rute)
    return /\/admin\/(client|stylist)-analytics\?/.test(s)
  }).map(rel)
  assert.deepEqual(stale, [], `deep linkovi na stare rute: ${stale.join(', ')}`)

  // i novi linkovi moraju nositi ispravan tab + parametar
  assert.match(at('features/daily-log/entry-table.tsx'), /\/admin\/analytics\?tab=clients&userId=\$\{e\.client\.id\}/)
  assert.match(at('features/daily-log/entry-table.tsx'), /\/admin\/analytics\?tab=stylists&stylistId=\$\{e\.stylistProfile\.id\}/)
  assert.match(at('features/dashboard/recent-reservations.tsx'), /\/admin\/analytics\?tab=clients&userId=\$\{r\.client\.id\}/)
  assert.match(at('pages/Users.tsx'), /navigate\(`\/admin\/analytics\?tab=clients&userId=\$\{u\.id\}`\)/)
  assert.match(at('pages/Stylists.tsx'), /to=\{`\/admin\/analytics\?tab=stylists&stylistId=\$\{s\.id\}`\}/)
  assert.match(at('pages/Reservations.tsx'), /to=\{`\/admin\/analytics\?tab=clients&userId=\$\{r\.client\.id\}`\}/)
})

test('2.4.2: dashboardTitleKey prati tab (izvršeno, ne regex)', async () => {
  const out = join(tmpdir(), `dashboard-titles-${process.pid}.mjs`)
  await build({
    entryPoints: [join(root, 'seo', 'dashboard-titles.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: out,
    logLevel: 'silent',
  })
  const { dashboardTitleKey } = await import(pathToFileURL(out).href)

  const cases = [
    ['/admin/analytics', '', 'nav.analytics'],
    ['/admin/analytics', '?tab=clients', 'nav.clientAnalytics'],
    ['/admin/analytics', '?tab=stylists', 'nav.stylistAnalytics'],
    ['/admin/analytics', '?tab=clients&userId=1', 'nav.clientAnalytics'],
    ['/admin/settings', '', 'nav.settings'],
    ['/admin/settings', '?tab=operations', 'pageTitles.settingsOperations'],
    ['/admin/settings', '?tab=appearance', 'pageTitles.settingsAppearance'],
    ['/admin/settings', '?tab=seo', 'pageTitles.settingsSeo'],
    ['/admin/settings', '?tab=email', 'nav.emailSettings'],
    ['/admin/settings', '?tab=notifications', 'nav.notifications'],
    ['/admin/settings', '?tab=releases', 'nav.appReleases'],
    ['/admin/analytics', '?tab=nonsense', 'nav.analytics'],
    ['/admin/daily-log', '?tab=whatever', 'nav.dailyLog'],
  ]
  for (const [path, search, key] of cases) {
    assert.equal(dashboardTitleKey(path, search), key, `${path}${search}`)
  }
  // nazad kompatibilnost: poziv bez search-a i dalje radi
  assert.equal(dashboardTitleKey('/admin/analytics'), 'nav.analytics')

  // SeoRouteDefaults mora proslijediti search (inace je gornje beskorisno)
  assert.match(seo, /const \{ pathname, search \} = useLocation\(\)/)
  assert.match(seo, /dashboardTitleKey\(pathname, search\)/)
  assert.match(seo, /\[pathname, search, t\]/)
})

test('i18n: adminAnalytics.tabs + tabsLabel postoje u oba jezika', () => {
  for (const lang of ['bs', 'en']) {
    const o = JSON.parse(at(`i18n/locales/${lang}.json`))
    assert.equal(typeof o.adminAnalytics.tabsLabel, 'string', `${lang}: tabsLabel`)
    assert.deepEqual(
      Object.keys(o.adminAnalytics.tabs).sort(),
      ['clients', 'overview', 'stylists'],
      `${lang}: adminAnalytics.tabs`,
    )
    for (const v of Object.values(o.adminAnalytics.tabs)) {
      assert.ok(typeof v === 'string' && v.length > 0, `${lang}: prazan naziv taba`)
    }
  }
})

test('moduli ostaju u pages/ i nisu ispražnjeni (13 testova ih čita po putanji)', () => {
  for (const p of ['pages/Analytics.tsx', 'pages/ClientAnalytics.tsx', 'pages/StylistAnalytics.tsx']) {
    assert.ok(statSync(join(root, p)).size > 500, `${p} je ispražnjen`)
  }
  assert.match(at('pages/Analytics.tsx'), /to=\{`\/admin\/analytics\?tab=stylists&stylistId=\$\{s\.stylistProfileId\}`\}/)
})
