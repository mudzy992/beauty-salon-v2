import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Zajednički **pravi** render harness — esbuild bundle + `renderToStaticMarkup`.
 *
 * Izdvojen iz `render-smoke.test.mjs` (2026-11-10) jer ga sada koriste **dva** testa:
 *   - `render-smoke.test.mjs`    — da komponente stvarno izvrše kod bez pada;
 *   - `axe-render-a11y.test.mjs` — axe-core nad istim, stvarno renderovanim markupom.
 *
 * Bez ovoga bi se ~415 linija ENTRY-ja, stub-ova i esbuild konfiguracije moralo
 * duplicirati, a dva primjerka bi se neminovno razdvojila.
 *
 * 🔴 `here` MORA ostati u ovom direktoriju: `ENTRY` koristi relativne importe
 * (`./data-table`, `../../../../pages/Dashboard`) koji se razrješavaju preko
 * `resolveDir: here`. `frontendRoot` je `join(here, '..' ×5)` = `frontend/`.
 */
const here = dirname(fileURLToPath(import.meta.url))
const frontendRoot = join(here, '..', '..', '..', '..', '..')
const cacheDir = join(frontendRoot, 'node_modules', '.cache', 'render-smoke')

const ENTRY = `
import { renderToStaticMarkup } from 'react-dom/server'

import { DataTable } from './data-table'
import { StatCard } from './stat-card'
import { StatGrid } from './stat-grid'
import { PageHeader } from './page-header'
import { FilterBar } from './filter-bar'
import { TablePagination } from './table-pagination'
import { FormSection } from './form-section'
import { StatusBadge, resolveReservationStatus, reservationStatusMap } from './status-badge'
import {
  effectiveReservationStatus,
  reservationStatusDescriptor,
} from '../../../reservations/reservation-status-view'
import { EmptyState, ErrorState, TableSkeleton } from './data-state'
import { DashboardFinanceStats } from '../../../dashboard/finance-stats'
import { DashboardOpsStats } from '../../../dashboard/ops-stats'
import { DashboardRecentReservations } from '../../../dashboard/recent-reservations'
import Dashboard from '../../../../pages/Dashboard'

const plainColumns = [
  { key: 'date', headerKey: 'common.date', render: (r) => r.date },
  { key: 'status', headerKey: 'common.status', render: (r) => r.status },
]
const rows = [{ id: '1', date: '2026-11-08', status: 'PENDING' }]

const stats = {
  usersCount: 12,
  stylistsCount: 3,
  servicesCount: 8,
  reservationsThisMonth: 40,
  pendingReservations: 5,
  completedReservations: 30,
  servicesRevenueThisMonth: 1000,
  tipsThisMonth: 120,
  expensesThisMonth: 400,
  pendingReviews: 2,
  blogPostsCount: 7,
}

export const scenarios = {
  // Ovo je scenario koji je pao u productionu.
  'DataTable bez sort propa i bez sortKey': () =>
    renderToStaticMarkup(
      <DataTable caption="t" columns={plainColumns} rows={rows} rowKey={(r) => r.id} />,
    ),
  'DataTable bez sort propa, prazne rows': () =>
    renderToStaticMarkup(
      <DataTable caption="t" columns={plainColumns} rows={[]} rowKey={(r) => r.id} />,
    ),
  'DataTable sa sortiranjem asc': () =>
    renderToStaticMarkup(
      <DataTable
        caption="t"
        columns={[{ key: 'date', headerKey: 'common.date', sortKey: 'date', render: (r) => r.date }]}
        rows={rows}
        rowKey={(r) => r.id}
        sort={{ key: 'date', direction: 'asc' }}
        onSortChange={() => {}}
      />,
    ),
  'DataTable sa sortiranjem desc': () =>
    renderToStaticMarkup(
      <DataTable
        caption="t"
        columns={[{ key: 'date', headerKey: 'common.date', sortKey: 'date', render: (r) => r.date }]}
        rows={rows}
        rowKey={(r) => r.id}
        sort={{ key: 'date', direction: 'desc' }}
        onSortChange={() => {}}
      />,
    ),
  'DataTable sort postavljen na drugu kolonu': () =>
    renderToStaticMarkup(
      <DataTable
        caption="t"
        columns={[
          { key: 'date', headerKey: 'common.date', sortKey: 'date', render: (r) => r.date },
          { key: 'status', headerKey: 'common.status', sortKey: 'status', render: (r) => r.status },
        ]}
        rows={rows}
        rowKey={(r) => r.id}
        sort={{ key: 'status', direction: 'asc' }}
        onSortChange={() => {}}
      />,
    ),
  'DataTable loading': () =>
    renderToStaticMarkup(
      <DataTable caption="t" columns={plainColumns} rows={[]} rowKey={(r) => r.id} loading />,
    ),
  'DataTable error': () =>
    renderToStaticMarkup(
      <DataTable caption="t" columns={plainColumns} rows={[]} rowKey={(r) => r.id} error="greska" />,
    ),
  'DataTable empty': () =>
    renderToStaticMarkup(
      <DataTable
        caption="t"
        columns={plainColumns}
        rows={[]}
        rowKey={(r) => r.id}
        empty={<EmptyState title="nema" />}
      />,
    ),
  'StatCard bez trenda': () => renderToStaticMarkup(<StatCard label="l" value="1" />),
  'StatCard sa trendom': () =>
    renderToStaticMarkup(
      <StatCard label="l" value="1" trend={{ direction: 'down', label: 'negativno' }} tone="bad" />,
    ),
  'StatCard svi tonovi': () =>
    renderToStaticMarkup(
      <>
        {['default', 'ok', 'warn', 'bad', 'info', 'neutral'].map((tone) => (
          <StatCard key={tone} label={tone} value="1" tone={tone} />
        ))}
      </>,
    ),
  'StatGrid': () =>
    renderToStaticMarkup(
      <StatGrid
        label="g"
        columns={5}
        items={[
          { label: 'a', value: '1' },
          { label: 'b', value: '2', tone: 'ok' },
        ]}
      />,
    ),
  'PageHeader bez opisa': () => renderToStaticMarkup(<PageHeader title="t" />),
  'PageHeader sa opisom i akcijama': () =>
    renderToStaticMarkup(<PageHeader title="t" description="d" actions={<button>x</button>} />),
  'FilterBar': () =>
    renderToStaticMarkup(
      <FilterBar resultSummary="1-10 od 20" onReset={() => {}}>
        <label htmlFor="q">q</label>
        <input id="q" />
      </FilterBar>,
    ),
  'TablePagination prva stranica': () =>
    renderToStaticMarkup(
      <TablePagination page={1} pageSize={10} total={25} onPageChange={() => {}} />,
    ),
  'TablePagination sredina': () =>
    renderToStaticMarkup(
      <TablePagination page={2} pageSize={10} total={25} onPageChange={() => {}} />,
    ),
  'TablePagination total 0': () =>
    renderToStaticMarkup(
      <TablePagination page={1} pageSize={10} total={0} onPageChange={() => {}} />,
    ),
  'FormSection': () =>
    renderToStaticMarkup(
      <FormSection title="t" description="d">
        <label htmlFor="form-section-fixture">Polje</label>
        <input id="form-section-fixture" />
      </FormSection>,
    ),
  'StatusBadge svi rezervacijski statusi': () =>
    renderToStaticMarkup(
      <>
        {Object.entries(reservationStatusMap).map(([status, descriptor]) => (
          <StatusBadge key={status} status={descriptor} />
        ))}
      </>,
    ),
  'StatusBadge nepoznat status (fallback)': () =>
    renderToStaticMarkup(
      <StatusBadge status={resolveReservationStatus('NEKI_NOVI_STATUS')} label="NEKI_NOVI_STATUS" />,
    ),
  // Faza 2 (D2, 1.4.1): rezervacijska lista vise ne prenosi status samo bojom.
  // Ovi scenariji izvrsavaju reservationStatusDescriptor iz nove module.
  'reservationStatusDescriptor svih 11 statusa iz status.ts': () =>
    renderToStaticMarkup(
      <>
        {[
          'PENDING',
          'CONFIRMED',
          'IN_PROGRESS',
          'COMPLETED',
          'ATTENDANCE_CONFIRMED',
          'CANCELLED_BY_CLIENT',
          'CANCELLED_BY_STYLISTS',
          'NO_SHOW',
          'STYLIST_REVIEW',
          'AWAITING_DAILY_LOG',
          'CANCELLED_UNCONFIRMED_ATTENDANCE',
        ].map((status) => (
          <StatusBadge key={status} status={reservationStatusDescriptor(status)} label={status} />
        ))}
      </>,
    ),
  'reservationStatusDescriptor specijalni slucaj CANCELLED_BY_CLIENT + razlog': () =>
    renderToStaticMarkup(
      <StatusBadge
        status={reservationStatusDescriptor('CANCELLED_BY_CLIENT', 'Nije potvrđen dolazak u roku')}
        label="otkazano (nepotvrdjen dolazak)"
      />,
    ),
  'reservationStatusDescriptor nepoznat status ne pada': () =>
    renderToStaticMarkup(
      <StatusBadge
        status={reservationStatusDescriptor('SASVIM_NOVI_STATUS', null)}
        label="SASVIM_NOVI_STATUS"
      />,
    ),
  'effectiveReservationStatus mapiranje': () => {
    const special = effectiveReservationStatus('CANCELLED_BY_CLIENT', 'Nije potvrđen dolazak u roku')
    const plain = effectiveReservationStatus('CANCELLED_BY_CLIENT', 'Klijent otkazao')
    const passthrough = effectiveReservationStatus('CONFIRMED', null)
    if (special !== 'CANCELLED_UNCONFIRMED_ATTENDANCE') throw new Error('specijalni slucaj: ' + special)
    if (plain !== 'CANCELLED_BY_CLIENT') throw new Error('obicno otkazivanje: ' + plain)
    if (passthrough !== 'CONFIRMED') throw new Error('prosljedjen status: ' + passthrough)
    return '<ok />'
  },
  'EmptyState / ErrorState / TableSkeleton': () =>
    renderToStaticMarkup(
      <>
        <EmptyState title="nema" description="d" />
        <ErrorState description="greska" />
        <TableSkeleton rows={2} columns={3} />
      </>,
    ),
  'DashboardFinanceStats': () => renderToStaticMarkup(<DashboardFinanceStats stats={stats} />),
  'DashboardFinanceStats neto negativan': () =>
    renderToStaticMarkup(
      <DashboardFinanceStats stats={{ ...stats, servicesRevenueThisMonth: 10, tipsThisMonth: 0, expensesThisMonth: 500 }} />,
    ),
  'DashboardOpsStats': () => renderToStaticMarkup(<DashboardOpsStats stats={stats} />),
  'DashboardOpsStats bez recenzija na cekanju': () =>
    renderToStaticMarkup(<DashboardOpsStats stats={{ ...stats, pendingReviews: 0 }} />),
  'DashboardRecentReservations': () =>
    renderToStaticMarkup(
      <DashboardRecentReservations
        reservations={[
          {
            id: 'r1',
            reservationDate: '2026-11-08',
            startTime: '10:00',
            status: 'CONFIRMED',
            client: { id: 'c1', firstName: 'A', lastName: 'B' },
            service: { name: 'S' },
          },
          { id: 'r2', reservationDate: '2026-11-09', startTime: '11:00', status: 'NEPOZNAT' },
        ]}
      />,
    ),
  'DashboardRecentReservations prazno': () =>
    renderToStaticMarkup(<DashboardRecentReservations reservations={[]} />),

  // ---- D9: error grane koje su dodane u Dashboard.tsx ----
  'Dashboard potpuni pad izvora prikazuje error stanje s retry': () => {
    globalThis.__dashboardState = {
      stats: { usersCount: 0, stylistsCount: 0, servicesCount: 0, reservationsThisMonth: 0, pendingReservations: 0, completedReservations: 0, servicesRevenueThisMonth: 0, tipsThisMonth: 0, expensesThisMonth: 0, pendingReviews: 0, blogPostsCount: 0 },
      loading: false,
      failedSources: ['usersCount', 'stylists', 'services', 'reservationSummary', 'incomeBook', 'expenseBook', 'reviews', 'blogPosts'],
      loadError: true,
    }
    return renderToStaticMarkup(<Dashboard />)
  },
  'Dashboard djelimični pad prikazuje banner a zadržava podatke': () => {
    globalThis.__dashboardState = {
      stats: { usersCount: 12, stylistsCount: 3, servicesCount: 8, reservationsThisMonth: 40, pendingReservations: 5, completedReservations: 30, servicesRevenueThisMonth: 1000, tipsThisMonth: 120, expensesThisMonth: 400, pendingReviews: 2, blogPostsCount: 7 },
      loading: false,
      failedSources: ['incomeBook'],
      loadError: false,
    }
    return renderToStaticMarkup(<Dashboard />)
  },
  'Dashboard bez ijednog pada ne prikazuje banner': () => {
    globalThis.__dashboardState = {
      stats: { usersCount: 12, stylistsCount: 3, servicesCount: 8, reservationsThisMonth: 40, pendingReservations: 5, completedReservations: 30, servicesRevenueThisMonth: 1000, tipsThisMonth: 120, expensesThisMonth: 400, pendingReviews: 2, blogPostsCount: 7 },
      loading: false,
      failedSources: [],
      loadError: false,
    }
    return renderToStaticMarkup(<Dashboard />)
  },
}
`

const I18N_STUB = `
export const useTranslation = () => ({
  t: (key, options) => (options ? key + ':' + JSON.stringify(options) : key),
  i18n: { language: 'bs', changeLanguage: () => {} },
})
export const Trans = ({ children }) => children
export const initReactI18next = { type: '3rdParty', init: () => {} }
export default { useTranslation, Trans, initReactI18next }
`

const ROUTER_STUB = `
import { createElement } from 'react'
export const Link = ({ to, children, ...rest }) => createElement('a', { href: to, ...rest }, children)
export const NavLink = Link
export const useNavigate = () => () => {}
export const useLocation = () => ({ pathname: '/', search: '', hash: '' })
`

/**
 * D9 stubovi: Dashboard.tsx vuče useAuth i useDashboardData. Stanje hooka se
 * čita s globalThis tako da svaki scenario može postaviti svoj slučaj bez
 * importovanja stub modula (ENTRY je u drugom direktoriju).
 */
const AUTH_STUB = `
export const useAuth = () => ({
  user: { username: 'admin', roles: [] },
  login: () => {},
  logout: () => {},
})
export const AuthProvider = ({ children }) => children
`

const DASHBOARD_HOOK_STUB = `
export const DASHBOARD_SOURCE_COUNT = 8
export const useDashboardData = () => {
  const st = globalThis.__dashboardState || {}
  return {
    stats: st.stats || null,
    recentReservations: st.recentReservations || [],
    loading: !!st.loading,
    failedSources: st.failedSources || [],
    loadError: !!st.loadError,
    reload: () => {},
  }
}
`

const stubPlugin = {
  name: 'render-smoke-stubs',
  setup(build) {
    build.onResolve({ filter: /^react-i18next$/ }, () => ({
      path: 'react-i18next',
      namespace: 'stub',
    }))
    build.onResolve({ filter: /^react-router-dom$/ }, () => ({
      path: 'react-router-dom',
      namespace: 'stub-router',
    }))
    build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
      contents: I18N_STUB,
      loader: 'js',
    }))
    build.onLoad({ filter: /.*/, namespace: 'stub-router' }, () => ({
      contents: ROUTER_STUB,
      loader: 'js',
    }))
    build.onResolve({ filter: /context\/AuthContext$/ }, () => ({
      path: 'auth-stub',
      namespace: 'stub-auth',
    }))
    build.onResolve({ filter: /dashboard\/use-dashboard-data$/ }, () => ({
      path: 'dashboard-hook-stub',
      namespace: 'stub-dashboard-hook',
    }))
    build.onLoad({ filter: /.*/, namespace: 'stub-auth' }, () => ({
      contents: AUTH_STUB,
      loader: 'js',
    }))
    build.onLoad({ filter: /.*/, namespace: 'stub-dashboard-hook' }, () => ({
      contents: DASHBOARD_HOOK_STUB,
      loader: 'js',
    }))
  },
}

/**
 * Bundle je CJS, ne ESM: `lucide-react` je CommonJS modul i esbuild bi ga u ESM
 * izlazu morao dohvatiti preko dinamičkog `require('react')`, što Node u ESM-u
 * ne podržava. CJS izlaz + `createRequire` to izbjegava.
 */
const loadScenarios = async () => {
  const result = await build({
    stdin: {
      contents: ENTRY,
      resolveDir: here,
      loader: 'tsx',
      sourcefile: 'render-smoke-entry.tsx',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    jsx: 'automatic',
    write: false,
    target: 'node18',
    external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/server'],
    // `api/client.ts` (dohvacen transitivno preko Dashboard -> outbox-diagnostics)
    // cita `import.meta.env.VITE_API_URL` pri inicijalizaciji modula. U CJS izlazu
    // esbuild to pretvori u `import_meta.env` koji je undefined u Node-u, pa bez
    // define-a bundle padne pri ucitavanju, prije ijednog scenarija.
    define: { 'import.meta.env': JSON.stringify({ VITE_API_URL: 'http://render-smoke.test' }) },
    plugins: [stubPlugin],
    logLevel: 'silent',
  })

  mkdirSync(cacheDir, { recursive: true })
  const outFile = join(cacheDir, `bundle-${process.pid}.cjs`)
  writeFileSync(outFile, result.outputFiles[0].text, 'utf8')
  // Dashboard.tsx transitivno vuče auth store (zustand) koji pri inicijalizaciji
  // modula čita `localStorage.getItem(TOKEN_KEY)`. Node nema localStorage, pa ga
  // simuliramo PRIJE require-a — inače bundle padne pri učitavanju, ne pri renderu.
  if (typeof globalThis.localStorage === 'undefined') {
    globalThis.localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    }
  }
  return createRequire(import.meta.url)(outFile).scenarios
}

export { loadScenarios }
