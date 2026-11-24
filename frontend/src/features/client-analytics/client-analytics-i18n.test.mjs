import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)
const source = readFileSync(new URL('../../pages/ClientAnalytics.tsx', import.meta.url), 'utf8')
const dataHook = readFileSync(new URL('./use-client-analytics-data.ts', import.meta.url), 'utf8')
const presentation = readFileSync(new URL('./use-client-analytics-presentation.ts', import.meta.url), 'utf8')
assert.match(source, /import \{ useClientAnalyticsPresentation \} from '..\/features\/client-analytics\/use-client-analytics-presentation'/)
assert.match(source, /const \{ t, formatDateOnly, formatInstantDate, getReservationStatusLabel, getStylistName, getUserName \} = useClientAnalyticsPresentation\(\)/)
const dialog = readFileSync(new URL('./client-analytics-detail-dialog.tsx', import.meta.url), 'utf8')
const rating = readFileSync(new URL('./star-rating.tsx', import.meta.url), 'utf8')
const views = ['client-analytics-summary.tsx', 'client-reservations-table.tsx', 'client-manual-entries-table.tsx', 'client-reviews.tsx', 'client-debts.tsx', 'client-period-filter.tsx'].map((file) => readFileSync(new URL('./' + file, import.meta.url), 'utf8'))
const [summary, reservations, , reviews] = views
const all = [source, presentation, dialog, rating, ...views].join('\n')
assert.match(source, /useClientAnalyticsData\(\{ selectedUserId, appliedFrom, appliedTo \}\)/)
assert.match(source, /<ClientAnalyticsDetailDialog\b[\s\S]*?detailTriggerRef=\{detailTriggerRef\}/)
for (const component of ['ClientAnalyticsSummary', 'ClientReservationsTable', 'ClientManualEntriesTable', 'ClientReviews', 'ClientDebts', 'ClientPeriodFilter']) {
  assert.match(source, new RegExp(`<${component}\\b`))
  assert.match(source, new RegExp(`import \\{ ${component} \\} from `))
}
const literalKeys = new Set([...all.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key))
const leafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? leafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )

test('client analytics page translation references exist in both locales with matching keys', () => {
  const localizedKeys = locales.map((resource) => leafPaths(resource.clientAnalyticsPage, 'clientAnalyticsPage').sort())
  for (const key of literalKeys) {
    if (key.startsWith('clientAnalyticsPage.')) {
      assert.ok(localizedKeys[0].includes(key), `Missing Bosnian client analytics key: ${key}`)
      assert.ok(localizedKeys[1].includes(key), `Missing English client analytics key: ${key}`)
    }
  }
  assert.deepEqual(localizedKeys[0], localizedKeys[1])
  assert.match(presentation, /t\(`reservations\.statuses\.\$\{status\}`/)
})

test('client analytics dates and amounts follow the active locale', () => {
  assert.match(presentation, /formatDateOnlyLocale\(value\.slice\(0, 10\), getIntlLocale\(i18n\.language\)/)
  assert.match(presentation, /new Intl\.DateTimeFormat\(getIntlLocale\(i18n\.language\), \{ dateStyle: 'medium' \}\)/)
  assert.match(summary, /formatLocalizedAmount\(analytics\.stats\.totalSpent, i18n\.language\)/)
  assert.match(reservations, /formatLocalizedNumber\(Number\(r\.service\?\.price \?\? 0\), i18n\.language/)
  assert.doesNotMatch(all, /toLocaleDateString\(['"]bs-BA['"]\)|\.toFixed\(2\)/)
  assert.doesNotMatch(all, /'Odobreno'|'Na čekanju'|'Penaliziran'|'Registrovan'|'Detalji Rezervacije'/)
})

test('client analytics request and route contracts remain unchanged', () => {
  assert.match(dataHook, /api\.get<ClientAnalyticsData>\(`\/api\/users\/\$\{encodeURIComponent\(selectedUserId\)\}\/analytics`, \{ params \}\)/)
  assert.match(dataHook, /api\.get<ClientDebtRow\[]>\('\/api\/client-debts', \{ params: \{ clientId: selectedUserId \} \}\)/)
  assert.match(source, /next\.set\('fromDate', dateFrom\)/)
  assert.match(source, /next\.set\('toDate', dateTo\)/)
  assert.match(source, /navigate\('\/admin\/users'\)/)
  assert.match(summary, /\{getUserName\(analytics\.user\)\}/)
  assert.match(reservations, /\{r\.service\?\.name \?\? '-'\}/)
  assert.match(reviews, /\{r\.comment\}/)
})
