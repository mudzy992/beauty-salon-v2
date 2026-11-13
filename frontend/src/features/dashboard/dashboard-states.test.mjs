import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

/**
 * Stanja dashboarda (faza 1).
 *
 * WCAG 4.1.3 zahtijeva da se promjene stanja najave, ne samo prikažu. Ovaj test
 * zakucava da svako stanje ima najavu i tekstualni sadržaj — skelet bez
 * `role="status"` bi prošao vizuelno a pao ovdje.
 */
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const dashboard = read('../../pages/Dashboard.tsx')
const recent = read('./recent-reservations.tsx')
const outboxPanel = read('./outbox-diagnostics.tsx')
const outboxHook = read('./use-outbox.ts')

test('dashboard loading is an announced live region with a text alternative', () => {
  assert.match(dashboard, /role="status"/)
  assert.match(dashboard, /aria-live="polite"/)
  // Skelet je dekorativan; tekst za čitače ekrana je zaseban.
  assert.match(dashboard, /<span className="sr-only">\{t\('common\.loading'\)\}<\/span>/)
  assert.match(dashboard, /aria-hidden/)
  assert.match(dashboard, /animate-pulse/)
})

test('dashboard keeps its role gate for outbox diagnostics', () => {
  assert.match(dashboard, /role === 'SYSTEM_ADMIN' \|\| role === 'OWNER'/)
  assert.match(dashboard, /canViewOutboxDiagnostics \? <DashboardOutboxDiagnostics \/> : null/)
})

test('recent reservations has an explicit empty state', () => {
  assert.match(recent, /empty=\{<EmptyState title=\{t\('dashboard\.noReservations'\)\} \/>/)
})

test('outbox panel announces action outcomes in a live region', () => {
  assert.match(outboxPanel, /aria-live="polite"/)
  // Sva tri ishoda su pokrivena: greška učitavanja, uspjeh i neuspjeh replay-a.
  assert.match(outboxPanel, /dashboard\.outbox\.loadFailed/)
  assert.match(outboxPanel, /dashboard\.outbox\.replayQueued/)
  assert.match(outboxPanel, /dashboard\.outbox\.replayFailed/)
})

test('outbox loading state is announced, not just visual', () => {
  assert.match(outboxPanel, /role="status"/)
  assert.match(outboxPanel, /loading \? t\('dashboard\.outbox\.refreshing'\) : t\('dashboard\.outbox\.refresh'\)/)
})

test('outbox data layer tracks failure instead of silently defaulting', () => {
  // Faza 1: hook eksplicitno postavlja `failed` na grešku, tako da panel može
  // prikazati poruku umjesto nula koje izgledaju kao stvarni podaci.
  assert.match(outboxHook, /setFailed\(true\)/)
  assert.match(outboxHook, /setLoading\(false\)/)
  // Auditan replay i dalje nosi eksplicitnu potvrdu.
  assert.match(outboxHook, /confirmAtLeastOnce: true/)
  assert.match(outboxHook, /\/api\/reservations\/ops\/outbox/)
})

test('outbox panel surfaces the failure message from the hook', () => {
  assert.match(outboxPanel, /failed \?/)
  assert.match(outboxPanel, /useOutboxDiagnostics\(\)/)
})

test('partial source failures do not masquerade as zero metrics or empty reservations', () => {
  const finance = read('./finance-stats.tsx')
  const ops = read('./ops-stats.tsx')
  assert.match(finance, /incomeAvailable && expenseAvailable \? formatKm\(net\) : unavailable/)
  assert.match(finance, /incomeAvailable \? formatKm\(total\) : unavailable/)
  assert.match(ops, /missing\('reservationSummary'\) \? unavailable/)
  assert.match(ops, /missing\('reviews'\) \? unavailable/)
  assert.match(dashboard, /failedSources\.includes\('reservationSummary'\)/)
  assert.match(dashboard, /DashboardRecentReservations reservations=\{recentReservations\}/)
})
