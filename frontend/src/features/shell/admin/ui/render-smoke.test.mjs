import assert from 'node:assert/strict'
import test from 'node:test'

import { loadScenarios } from './render-harness.mjs'

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

// D9: greške učitavanja se moraju VIDJETI, ne renderovati kao nule.
// i18n stub vraća ključ (ili ključ:opcije), pa asertujemo ključeve.
test('D9: Dashboard prikazuje error stanje kad padnu svi izvori', () => {
  const html = scenarios['Dashboard potpuni pad izvora prikazuje error stanje s retry']()
  assert.match(html, /role="alert"/)
  assert.match(html, /dashboard\.loadError/)
  assert.match(html, /common\.retry/)
  // nule ne smiju proći kao podaci — statistike se ne renderuju
  assert.doesNotMatch(html, /dashboard\.users/)
})

test('D9: djelimični pad daje banner ali zadržava ispravne brojeve', () => {
  const html = scenarios['Dashboard djelimični pad prikazuje banner a zadržava podatke']()
  assert.match(html, /dashboard\.partialLoadError/)
  assert.match(html, /common\.retry/)
  // ispravni podaci ostaju vidljivi
  assert.match(html, /dashboard\.users/)
  assert.doesNotMatch(html, /dashboard\.loadError/)
})

test('D9: bez ijednog pada nema banner-a ni error stanja', () => {
  const html = scenarios['Dashboard bez ijednog pada ne prikazuje banner']()
  assert.doesNotMatch(html, /dashboard\.partialLoadError/)
  assert.doesNotMatch(html, /dashboard\.loadError/)
  assert.match(html, /dashboard\.users/)
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


test('shared Card distinguishes default surfaces from intentionally coloured backgrounds', () => {
  assert.match(scenarios['Shared Card default'](), /data-default-card-surface=""/)
  assert.doesNotMatch(scenarios['Shared Card custom background'](), /data-default-card-surface/)
  // A hover background must not cause default surface theming to override the hover state.
  assert.doesNotMatch(scenarios['Shared Card custom hover only'](), /data-default-card-surface/)
})
