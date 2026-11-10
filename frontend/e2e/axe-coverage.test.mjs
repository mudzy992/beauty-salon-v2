import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import {
  TRACKED_RULES,
  aggregateCoverage,
  coverageFileName,
  formatCoverageSummary,
  recordAxeCoverage,
  verdictFor,
} from './axe-coverage.mjs'

/**
 * Bilježenje axe pokrivenosti po pravilima.
 *
 * Test izvršava **stvarni** `axe-coverage.mjs` nad fiksiranim axe izvještajima — logika je
 * zato u `.mjs`, a ne u `.ts`. Ključna stvar koju ovo čuva: „0 failed" u CI-ju ne znači da
 * je pravilo prošlo. Može biti `inapplicable` (nema takvih čvorova) ili `incomplete`
 * (treba raspored/AT), a `verdictFor` te tri tvrdnje razdvaja. Bez toga bi se kriterij
 * mogao proglasiti ✅ na osnovu prazne stranice.
 */

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'axe-cov-'))
}

/** axe izvještaj kakav vraća `AxeBuilder.analyze()`, samo s poljima koja ovdje trebaju. */
function axeReport({ passed = [], violations = [], incomplete = [], inapplicable = [] }) {
  return {
    passes: passed.map((id) => ({ id })),
    violations: violations.map((id) => ({ id, nodes: [{}, {}] })),
    incomplete: incomplete.map((id) => ({ id })),
    inapplicable: inapplicable.map((id) => ({ id })),
  }
}

test('svako praćeno pravilo ima barem jedan WCAG kriterij i opis šta NE dokazuje', () => {
  assert.ok(TRACKED_RULES.length >= 10)
  for (const entry of TRACKED_RULES) {
    assert.match(entry.rule, /^[a-z0-9-]+$/)
    assert.ok(entry.criteria.length >= 1, `${entry.rule} nema kriterij`)
    for (const criterion of entry.criteria) assert.match(criterion, /^\d\.\d+\.\d+$/)
    assert.ok(entry.note.length > 3, `${entry.rule} nema opis`)
  }
  const ids = TRACKED_RULES.map((r) => r.rule)
  assert.equal(new Set(ids).size, ids.length, 'pravila se ne smiju ponavljati')
})

test('coverageFileName sateruje rutu u jedan fajl, bez poddirektorija', () => {
  assert.equal(coverageFileName('admin', '/admin/reservations/calendar'), 'admin__admin-reservations-calendar.json')
  assert.equal(coverageFileName('chromium', '/'), 'chromium__root.json')
  assert.equal(coverageFileName('stylist', '/stylist/inbox'), 'stylist__stylist-inbox.json')
  for (const name of [
    coverageFileName('admin', '/a/b'),
    coverageFileName('chromium', '/'),
  ]) {
    assert.equal(name.includes('/'), false, 'ime fajla ne smije sadržavati /')
    assert.equal(name.startsWith('-'), false)
  }
})

test('recordAxeCoverage upisuje status po pravilu, a nespomenuto pravilo je absent', () => {
  const dir = tempDir()
  const file = recordAxeCoverage(
    'admin',
    '/admin/settings',
    axeReport({
      passed: ['label-content-name-mismatch', 'label', 'button-name'],
      violations: ['color-contrast'],
      incomplete: ['target-size'],
      inapplicable: ['svg-img-alt'],
    }),
    dir,
  )

  const record = JSON.parse(readFileSync(file, 'utf8'))
  assert.equal(record.route, '/admin/settings')
  assert.equal(record.rules['label-content-name-mismatch'].status, 'passed')
  assert.equal(record.rules['color-contrast'].status, 'violations')
  assert.equal(record.rules['color-contrast'].nodes, 2)
  assert.equal(record.rules['target-size'].status, 'incomplete')
  assert.equal(record.rules['svg-img-alt'].status, 'inapplicable')
  // Pravilo kojeg nema ni u jednoj listi — npr. frame-title na stranici bez iframe-a.
  assert.equal(record.rules['frame-title'].status, 'absent')
  rmSync(dir, { recursive: true, force: true })
})

test('prekršaj ima prednost nad prolazom — isto pravilo ne može biti i PAD i PROLAZ', () => {
  const dir = tempDir()
  const file = recordAxeCoverage(
    'chromium',
    '/',
    axeReport({ passed: ['color-contrast'], violations: ['color-contrast'] }),
    dir,
  )
  const record = JSON.parse(readFileSync(file, 'utf8'))
  assert.equal(record.rules['color-contrast'].status, 'violations')
  rmSync(dir, { recursive: true, force: true })
})

test('aggregateCoverage sabira preko ruta i broji ih', () => {
  const dir = tempDir()
  recordAxeCoverage('admin', '/admin/settings', axeReport({ passed: ['color-contrast'] }), dir)
  recordAxeCoverage('admin', '/admin/salon', axeReport({ incomplete: ['color-contrast'] }), dir)
  recordAxeCoverage('chromium', '/', axeReport({ violations: ['color-contrast'] }), dir)
  recordAxeCoverage('stylist', '/stylist/inbox', axeReport({}), dir)

  const agg = aggregateCoverage(dir)
  assert.equal(agg.routeCount, 4)
  assert.equal(agg.totals['color-contrast'].passed, 1)
  assert.equal(agg.totals['color-contrast'].incomplete, 1)
  assert.equal(agg.totals['color-contrast'].violations, 1)
  assert.equal(agg.totals['color-contrast'].routes.length, 3, 'trag broji samo rute gdje se pravilo javilo')
  assert.equal(
    agg.totals['color-contrast'].routes.some((r) => r.endsWith(':absent')),
    false,
    'absent ne ide u trag — bio bi na svakoj ruti',
  )
  assert.equal(agg.totals['label'].absent, 4, 'pravilo koje se nigdje nije javilo je absent na svakoj ruti')
  rmSync(dir, { recursive: true, force: true })
})

test('aggregateCoverage nad nepostojećim direktorijem ne pada i javlja 0 ruta', () => {
  const agg = aggregateCoverage(join(tmpdir(), 'sigurno-ne-postoji-axe-cov'))
  assert.equal(agg.routeCount, 0)
  assert.equal(agg.totals['color-contrast'].passed, 0)
})

test('verdictFor razdvaja prolaz, nepotpuno, neprimijenjeno i pad', () => {
  const base = { passed: 0, violations: 0, incomplete: 0, inapplicable: 0, absent: 0, routes: [], nodes: 0 }
  assert.equal(verdictFor({ ...base, passed: 5 }), 'PROLAZ')
  assert.equal(verdictFor({ ...base, passed: 5, violations: 1 }), 'PAD')
  assert.equal(verdictFor({ ...base, passed: 5, incomplete: 1 }), 'NEPOTPUNO')
  // Ključno: inapplicable/absent svuda NIJE prolaz — stranica jednostavno nema takvih čvorova.
  assert.equal(verdictFor({ ...base, inapplicable: 5 }), 'NIJE_SE_PRIMJENIO')
  assert.equal(verdictFor({ ...base, absent: 5 }), 'NIJE_SE_PRIMJENIO')
})

test('sažetak nosi broj ruta i presudu po pravilu, ne samo brojeve', () => {
  const dir = tempDir()
  recordAxeCoverage('admin', '/admin/settings', axeReport({ passed: ['label-content-name-mismatch'] }), dir)
  const summary = formatCoverageSummary(aggregateCoverage(dir))
  assert.match(summary, /axe pokrivenost — 1 ruta/)
  assert.match(summary, /2\.5\.3 label-content-name-mismatch: PROLAZ/)
  assert.match(summary, /2\.5\.8 target-size: NIJE_SE_PRIMJENIO/)
  assert.equal(summary.split('\n').length >= TRACKED_RULES.length, true)
  rmSync(dir, { recursive: true, force: true })
})

test('kriterij čije pravilo nigdje nije prošlo ne smije izgledati kao dokazan', () => {
  const dir = tempDir()
  recordAxeCoverage('chromium', '/', axeReport({ inapplicable: TRACKED_RULES.map((r) => r.rule) }), dir)
  const agg = aggregateCoverage(dir)
  for (const { rule } of TRACKED_RULES) {
    assert.equal(verdictFor(agg.totals[rule]), 'NIJE_SE_PRIMJENIO')
  }
  assert.equal(formatCoverageSummary(agg).includes('PROLAZ'), false)
  rmSync(dir, { recursive: true, force: true })
})

test('zapis je čitljiv JSON s jednim fajlom po ruti (nema prepisivanja pri fullyParallel)', () => {
  const dir = tempDir()
  recordAxeCoverage('admin', '/admin/a', axeReport({}), dir)
  recordAxeCoverage('admin', '/admin/b', axeReport({}), dir)
  const files = readdirSync(dir)
  assert.equal(files.length, 2)
  for (const name of files) {
    const parsed = JSON.parse(readFileSync(join(dir, name), 'utf8'))
    assert.ok(parsed.project && parsed.route && parsed.rules)
  }
  // Isti poziv ne smije stvoriti drugi fajl.
  recordAxeCoverage('admin', '/admin/a', axeReport({}), dir)
  assert.equal(readdirSync(dir).length, 2)
  writeFileSync(join(dir, 'noise.txt'), 'x', 'utf8')
  assert.equal(aggregateCoverage(dir).routeCount, 2, 'ne-JSON fajlovi se preskaču')
  rmSync(dir, { recursive: true, force: true })
})
