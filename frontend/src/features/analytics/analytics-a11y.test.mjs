import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const analytics = readFileSync(new URL('../../pages/Analytics.tsx', import.meta.url), 'utf8')
const client = readFileSync(new URL('../../pages/ClientAnalytics.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../../index.css', import.meta.url), 'utf8')

// ---------------------------------------------------------------------------
// Faza 6 — Analitika
//
// 1.1.1: recharts graf nije imao NIJEDNU tekstualnu alternativu (ni role="img",
//        ni aria-label, ni figuru, ni tabelu podataka).
// 2.4.6: ClientAnalytics.tsx nije imao <h1>.
// 1.3.1: 17 <th> bez scope, 0 <caption>.
// 1.4.3: text-slate-400 (2.56:1).  1.4.11: progress bar bg-emerald-500 (2.32:1).
// ---------------------------------------------------------------------------

const headers = (src) => src.match(/<th\b[^>]*>/g) || []

test('recharts graf ima tekstualnu alternativu (1.1.1)', () => {
  assert.match(analytics, /role="img"/, 'graf mora imati role="img"')
  assert.match(
    analytics,
    /aria-label=\{t\('adminAnalytics\.chartAriaLabel', chartSummary\)\}/,
    'aria-label mora nositi kljucne brojeve iz chartSummary',
  )
  assert.match(analytics, /<figure className="m-0">/, 'graf mora biti omotan u <figure>')
  assert.equal((analytics.match(/<\/figure>/g) || []).length, 1)

  // sazetak mora stvarno racunati zbirove, ne biti prazan placeholder
  assert.match(analytics, /const chartSummary = useMemo\(/)
  for (const key of ['income', 'expenses', 'tips']) {
    assert.match(
      analytics,
      new RegExp(`sum\\('${key}'\\)`),
      `chartSummary mora sabirati ${key}`,
    )
  }
})

test('podaci grafa dostupni su i kao tabela (1.1.1)', () => {
  assert.match(analytics, /<details className="mt-4">/)
  assert.match(analytics, /\{t\('adminAnalytics\.showDataTable'\)\}/)
  assert.match(
    analytics,
    /<caption className="sr-only">\{t\('adminAnalytics\.chartTableCaption'\)\}<\/caption>/,
  )
  // tabela podataka ima 5 kolona, sve sa scope
  const chartTable = analytics.slice(analytics.indexOf('<details className="mt-4">'))
  const ths = headers(chartTable.slice(0, chartTable.indexOf('</table>')))
  assert.equal(ths.length, 5, 'tabela grafa ima 5 kolona')
  assert.deepEqual(
    ths.filter((h) => !/scope="col"/.test(h)),
    [],
    'svaka kolona tabele grafa mora imati scope="col"',
  )
  assert.equal(
    (chartTable.match(/<td data-label=\{t\('adminAnalytics\./g) || []).length,
    5,
    'svaka celija tabele grafa mora imati dinamicki data-label',
  )
})

test('ClientAnalytics ima <h1> u svim stanjima (2.4.6)', () => {
  assert.match(client, /<PageHeader/, 'stranica mora koristiti PageHeader (jedini <h1>)')
  assert.match(client, /title=\{t\('clientAnalyticsPage\.title'\)\}/)
  // naslov je staticki, pa postoji i tokom loading/error stanja
  assert.match(client, /description=\{analytics\?\.user \? getUserName\(analytics\.user\) : undefined\}/)
})

test('ClientAnalytics tabele imaju scope i caption (1.3.1)', () => {
  const ths = headers(client)
  assert.equal(ths.length, 17, 'tacno 17 <th> u tri tabele')
  assert.deepEqual(
    ths.filter((h) => !/scope="col"/.test(h)),
    [],
    'nijedan <th> ne smije ostati bez scope',
  )
  assert.equal((client.match(/<caption/g) || []).length, 3, 'tri tabele -> tri <caption>')
  assert.equal((client.match(/<table className="app-table data-table/g) || []).length, 3)
  // 17 celija + 2 empty-state colSpan = 19
  assert.equal((client.match(/<td\b/g) || []).length, 19)
  assert.equal((client.match(/<td data-label=\{t\(/g) || []).length, 17)
  assert.equal(
    (client.match(/<td data-label="/g) || []).length,
    0,
    'data-label ne smije biti hardkodovan literal',
  )
})

test('card-mode CSS i dalje cilja data-table', () => {
  assert.match(css, /table\.data-table tbody td::before/)
})

test('popravljeni kontrastni prekršaji se ne vracaju (1.4.3 / 1.4.11)', () => {
  assert.equal(
    (client.match(/text-slate-400/g) || []).length,
    0,
    'text-slate-400 je 2.56:1 — mora ostati uklonjen',
  )
  assert.equal(
    (client.match(/bg-emerald-500/g) || []).length,
    0,
    'bg-emerald-500 je 2.32:1 na track-u — mora ostati uklonjen',
  )
  assert.match(client, /bg-ok-foreground/, 'progress bar mora koristiti ok-foreground (6.51:1)')
})
