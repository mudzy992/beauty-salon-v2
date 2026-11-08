import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Render smoke test — **pravi** render, ne regex nad izvorom.
 *
 * Zašto postoji: statički testovi (`templates-a11y`, `dashboard-a11y`) čitaju tekst
 * fajla i ne mogu uhvatiti runtime pad. Konkretno, `DataTable` je imao
 * `const isSorted = sort?.key === column.sortKey` pa je za kolonu bez `sortKey`
 * i poziv bez `sort` davao `undefined === undefined` → `sort!.direction` →
 * `TypeError: Cannot read properties of undefined (reading 'direction')`.
 * Prošlo je kroz 147/147 zelenih testova i palo tek u browseru.
 *
 * Ovaj test bundle-uje komponente esbuild-om i renderuje ih kroz
 * `react-dom/server`, tako da svaki scenario mora stvarno izvršiti kod.
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
import { EmptyState, ErrorState, TableSkeleton } from './data-state'
import { DashboardFinanceStats } from '../../../dashboard/finance-stats'
import { DashboardOpsStats } from '../../../dashboard/ops-stats'
import { DashboardRecentReservations } from '../../../dashboard/recent-reservations'

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
        <input />
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
    plugins: [stubPlugin],
    logLevel: 'silent',
  })

  mkdirSync(cacheDir, { recursive: true })
  const outFile = join(cacheDir, `bundle-${process.pid}.cjs`)
  writeFileSync(outFile, result.outputFiles[0].text, 'utf8')
  return createRequire(import.meta.url)(outFile).scenarios
}

const scenarios = await loadScenarios()
const names = Object.keys(scenarios)

test('render smoke covers the templates and dashboard feature components', () => {
  assert.ok(names.length >= 25, `ocekivano >= 25 scenarija, dobijeno ${names.length}`)
  for (const critical of [
    'DataTable bez sort propa i bez sortKey',
    'DashboardFinanceStats',
    'DashboardOpsStats',
    'DashboardRecentReservations',
  ]) {
    assert.ok(names.includes(critical), `nedostaje scenario: ${critical}`)
  }
})

for (const name of names) {
  test(`renderuje bez pada: ${name}`, () => {
    let html
    assert.doesNotThrow(() => {
      html = scenarios[name]()
    }, `scenario "${name}" je bacio gresku pri renderu`)
    assert.equal(typeof html, 'string')
    assert.ok(html.length > 0, `scenario "${name}" nije proizveo markup`)
  })
}

test('DataTable bez sortiranja ne smije postaviti aria-sort na nesortabilne kolone', () => {
  const html = scenarios['DataTable bez sort propa i bez sortKey']()
  assert.doesNotMatch(html, /aria-sort/, 'kolona bez sortKey ne smije imati aria-sort')
  assert.match(html, /scope="col"/)
  assert.match(html, /<caption/)
})

test('DataTable sa sortiranjem postavlja aria-sort programski', () => {
  const asc = scenarios['DataTable sa sortiranjem asc']()
  assert.match(asc, /aria-sort="ascending"/)
  const desc = scenarios['DataTable sa sortiranjem desc']()
  assert.match(desc, /aria-sort="descending"/)
})

test('nepoznat rezervacijski status ne pada i ostaje neutralan', () => {
  const html = scenarios['StatusBadge nepoznat status (fallback)']()
  assert.match(html, /NEPOZNAT|NEKI_NOVI_STATUS/)
  assert.match(html, /data-admin-badge/)
})
