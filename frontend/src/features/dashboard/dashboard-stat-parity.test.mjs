import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

/**
 * Paritet statistika (faza 1 — dashboard pilot).
 *
 * Vizuelni redizajn ne smije promijeniti ni jedan broj. Ovaj test zakucava
 * formule i izvore podataka koje su postojale prije redizajna, tako da bilo
 * koja kasnija izmjena stat kartica mora namjerno promijeniti i ovaj test.
 */
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

/**
 * Komentari dokumentuju *zašto* je nešto promijenjeno i namjerno navode stare
 * vrijednosti (npr. `text-orange-600` uz omjer kontrasta). Provjere klasa zato
 * idu nad kodom bez komentara.
 */
const stripComments = (source) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const finance = stripComments(read('./finance-stats.tsx'))
const ops = stripComments(read('./ops-stats.tsx'))

test('finance totals keep the exact pre-redesign formulas', () => {
  // Ukupan prihod = servisi + napojnice (KIF totalRevenue je SAMO servisi).
  assert.match(finance, /const services = stats\.servicesRevenueThisMonth/)
  assert.match(finance, /const tips = stats\.tipsThisMonth/)
  assert.match(finance, /const total = services \+ tips/)

  // Neto = ukupno − rashodi.
  assert.match(finance, /const expenses = stats\.expensesThisMonth/)
  assert.match(finance, /const net = total - expenses/)

  // Iznosi idu kroz lokalizirani formatter, ne kroz ručno slaganje stringa.
  assert.match(finance, /formatLocalizedAmount\(amount, i18n\.language\)/)
})

test('finance cards render every pre-redesign metric', () => {
  for (const key of [
    'dashboard.totalIncome',
    'dashboard.serviceIncome',
    'dashboard.tips',
    'dashboard.expenses',
    'dashboard.net',
    'dashboard.financeThisMonth',
    'dashboard.incomeSummary',
  ]) {
    assert.match(finance, new RegExp(`'${key.replace('.', '\\.')}'`), `nedostaje ${key}`)
  }
})

test('ops counters keep their sources and grouping hints', () => {
  // Brojači idu kroz formatLocalizedNumber bez decimala.
  assert.match(ops, /formatLocalizedNumber\(count, i18n\.language, \{ maximumFractionDigits: 0 \}\)/)

  for (const field of [
    'stats.reservationsThisMonth',
    'stats.completedReservations',
    'stats.pendingReservations',
    'stats.usersCount',
    'stats.stylistsCount',
    'stats.servicesCount',
    'stats.pendingReviews',
    'stats.blogPostsCount',
  ]) {
    assert.match(ops, new RegExp(field.replace('.', '\\.')), `nedostaje ${field}`)
  }

  // Grupe se i dalje objašnjavaju u hintu, ne samo naslovom.
  assert.match(ops, /'dashboard\.reservationCounts'/)
  assert.match(ops, /'dashboard\.userCounts'/)
})

test('pending reviews emphasis no longer relies on colour alone', () => {
  // Prijašnja vrijednost bila je `text-orange-600` (3.56:1, van brand palete).
  assert.doesNotMatch(ops, /text-orange-600/)
  // Naglasak sada ima i ikonu i tekstualnu oznaku, ne samo ton.
  assert.match(ops, /tone: hasPendingReviews \? 'warn' : 'default'/)
  assert.match(ops, /icon: hasPendingReviews \? <AlertCircle/)
  assert.match(ops, /hint: hasPendingReviews \? t\('dashboard\.pendingReviewsAttention'\)/)
})

test('net income sign is conveyed by arrow and text, not colour', () => {
  assert.match(finance, /direction: net > 0 \? 'up' : net < 0 \? 'down' : 'flat'/)
  assert.match(finance, /label: net < 0 \? t\('dashboard\.netNegative'\) : t\('dashboard\.netPositive'\)/)
})

test('dashboard feature contains no raw slate or hex colours', () => {
  for (const [name, source] of [
    ['finance-stats.tsx', finance],
    ['ops-stats.tsx', ops],
    ['recent-reservations.tsx', read('./recent-reservations.tsx')],
    ['outbox-diagnostics.tsx', read('./outbox-diagnostics.tsx')],
    ['outbox-events-table.tsx', read('./outbox-events-table.tsx')],
    ['outbox-replay-dialog.tsx', read('./outbox-replay-dialog.tsx')],
    ['Dashboard.tsx', read('../../pages/Dashboard.tsx')],
  ]) {
    assert.doesNotMatch(source, /\b(?:bg|text|border)-(?:slate|gray|zinc|neutral)-\d{2,3}\b/, `${name}: sirova slate klasa`)
    assert.doesNotMatch(source, /#[0-9a-fA-F]{3,8}\b/, `${name}: hex boja`)
  }
})
