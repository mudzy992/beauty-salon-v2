import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

/**
 * Strukturalna WCAG 2.2 provjera dashboarda (faza 1).
 *
 * Ovo su provjere koje se mogu potvrditi bez rendera: semantika markupa.
 * Vizuelni kontrast pokriva `check_ui_contrast.py`; ovo pokriva 1.3.1, 1.4.1,
 * 2.4.6 i 4.1.2.
 */
/**
 * Dokumentacija namjerno navodi `<h1>` u tekstu (npr. „jedini `<h1>` na
 * stranici"). Brojanje naslova zato ide nad kodom bez komentara.
 */
const stripComments = (source) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const read = (path) => stripComments(readFileSync(new URL(path, import.meta.url), 'utf8'))

const shell = (file) => read(`../shell/admin/ui/${file}`)
const pageHeader = shell('page-header.tsx')
const statGrid = shell('stat-grid.tsx')
const statCard = shell('stat-card.tsx')
const dataTable = shell('data-table.tsx')
const statusBadge = shell('status-badge.tsx')

const dashboard = read('../../pages/Dashboard.tsx')
const recent = read('./recent-reservations.tsx')
const outboxTable = read('./outbox-events-table.tsx')

test('2.4.6 — page header contributes exactly one h1 and no other heading', () => {
  assert.equal((pageHeader.match(/<h1[\s>]/g) ?? []).length, 1)
  assert.equal((pageHeader.match(/<h[2-6][\s>]/g) ?? []).length, 0)
  // Dashboard koristi PageHeader i ne duplira naslov.
  assert.match(dashboard, /<PageHeader/)
  assert.equal((dashboard.match(/<h1[\s>]/g) ?? []).length, 0)
})

test('1.3.1 — stat grid is a real list with an accessible name', () => {
  assert.match(statGrid, /<ul\s/)
  assert.match(statGrid, /aria-label=\{label\}/)
  assert.match(statGrid, /<li key=\{item\.label\}>/)
  // Lista prima `items`, ne `children`, pa ne može ostati prazna bez imena.
  assert.match(statGrid, /items: StatCardProps\[\]/)
})

test('1.3.1 — data table names itself and scopes its headers', () => {
  assert.match(dataTable, /<caption className="sr-only">\{caption\}<\/caption>/)
  assert.match(dataTable, /scope="col"/)
  assert.match(dataTable, /data-label=\{t\(column\.headerKey\)\}/)
})

test('1.4.1 — status is never conveyed by colour alone', () => {
  assert.match(statusBadge, /<Icon aria-hidden/)
  assert.match(statusBadge, /\{label \?\? t\(status\.labelKey\)\}/)
  // Stat kartica: trend ima i strelicu i tekstualnu oznaku.
  assert.match(statCard, /trend\.direction/)
  assert.match(statCard, /trend\.label/)
  assert.match(statCard, /tabular-nums/)
})

test('1.3.1 — dates are machine-readable', () => {
  assert.match(recent, /<time dateTime=\{/)
  assert.match(outboxTable, /<time dateTime=\{event\.updatedAt\}>/)
})

test('1.4.1 — table links are identifiable without colour', () => {
  // Link u tabeli je uvijek podvučen; boja nije jedini pokazatelj.
  assert.match(recent, /className="text-brand-gold-text underline hover:no-underline"/)
})

test('4.1.2 — per-row actions have distinct accessible names', () => {
  assert.match(
    outboxTable,
    /aria-label=\{t\('dashboard\.outbox\.replayForEvent', \{ eventId: event\.id\.slice\(0, 8\) \}\)\}/,
  )
})

test('1.3.1 — dashboard sections use heading levels, not bold text', () => {
  for (const [name, source] of [
    ['finance-stats.tsx', read('./finance-stats.tsx')],
    ['ops-stats.tsx', read('./ops-stats.tsx')],
    ['recent-reservations.tsx', recent],
    ['outbox-diagnostics.tsx', read('./outbox-diagnostics.tsx')],
  ]) {
    assert.match(source, /<h2/, `${name}: sekcija bez <h2>`)
  }
})

test('no dashboard feature file uses outline-none without a focus style', () => {
  const files = [
    dashboard,
    recent,
    read('./finance-stats.tsx'),
    read('./ops-stats.tsx'),
    read('./outbox-diagnostics.tsx'),
    outboxTable,
    read('./outbox-replay-dialog.tsx'),
  ]
  for (const source of files) {
    // `outline-none` bez `focus-visible:` ringa uklanja indikator fokusa (2.4.7).
    if (/\boutline-none\b/.test(source)) {
      assert.match(source, /focus-visible:/, 'outline-none bez focus-visible stila')
    }
  }
})
