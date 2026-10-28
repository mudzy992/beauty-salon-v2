import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)
const source = readFileSync(new URL('../../pages/ClientAnalytics.tsx', import.meta.url), 'utf8')
const literalKeys = new Set([...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key))
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
  assert.match(source, /t\(`reservations\.statuses\.\$\{status\}`/)
})

test('client analytics dates and amounts follow the active locale', () => {
  assert.match(source, /formatDateOnlyLocale\(value\.slice\(0, 10\), getIntlLocale\(i18n\.language\)/)
  assert.match(source, /new Intl\.DateTimeFormat\(getIntlLocale\(i18n\.language\), \{ dateStyle: 'medium' \}\)/)
  assert.match(source, /formatLocalizedAmount\(analytics\.stats\.totalSpent, i18n\.language\)/)
  assert.match(source, /formatLocalizedNumber\(Number\(r\.service\?\.price \?\? 0\), i18n\.language/)
  assert.doesNotMatch(source, /toLocaleDateString\(['"]bs-BA['"]\)|\.toFixed\(2\)/)
  assert.doesNotMatch(source, /'Odobreno'|'Na čekanju'|'Penaliziran'|'Registrovan'|'Detalji Rezervacije'/)
})

test('client analytics request and route contracts remain unchanged', () => {
  assert.match(source, /api\.get<ClientAnalyticsData>\(`\/api\/users\/\$\{userId\}\/analytics`, \{ params: queryParams \}\)/)
  assert.match(source, /api\.get<ClientDebtRow\[]>\('\/api\/client-debts', \{ params: \{ clientId: userId \} \}\)/)
  assert.match(source, /if \(from\) params\.fromDate = from/)
  assert.match(source, /if \(to\) params\.toDate = to/)
  assert.match(source, /navigate\('\/admin\/users'\)/)
  assert.match(source, /\{getUserName\(analytics\.user\)\}/)
  assert.match(source, /\{r\.service\?\.name \?\? '-'\}/)
  assert.match(source, /\{r\.comment\}/)
})
