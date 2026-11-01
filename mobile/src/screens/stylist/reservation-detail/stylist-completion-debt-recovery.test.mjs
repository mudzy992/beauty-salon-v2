import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const hook = readFileSync(new URL('./hooks/use-reservation-complete-flow.ts', import.meta.url), 'utf8')
const modal = readFileSync(new URL('./complete-reservation-modal.tsx', import.meta.url), 'utf8')

test('completion debt reads preserve prior data and distinguish failure from an empty list', () => {
  assert.match(hook, /const \[clientDebtsError, setClientDebtsError\] = useState\(false\)/)
  assert.match(hook, /const normalized = normalizeClientDebts\(data\);\s*if \(!normalized\) throw new Error\(\)/)
  assert.match(hook, /catch \{\s*if \(generation === debtRequestGeneration\.current\) setClientDebtsError\(true\);\s*\}/)
  assert.doesNotMatch(hook, /catch \{\s*setClientDebts\(\[\]\);\s*\}/)
  assert.match(hook, /debtRequestGeneration\.current/)
  assert.match(modal, /clientDebtsError/)
  assert.match(modal, /clientDebtsLoadError/)
  assert.match(modal, /onRetryClientDebts/)
  assert.match(modal, /!clientDebtsLoading && !clientDebtsError && clientDebts\.length === 0/)
  assert.match(modal, /disabled=\{clientDebtsLoading \|\| clientDebtsError\}/)
})

test('completion mutation validates the created entry ID and avoids re-submission on ambiguous success', () => {
  assert.match(hook, /api\.post<unknown>\([\s\S]*?\/api\/daily-log\/from-reservation/)
  assert.match(hook, /parseCreatedDailyLogEntryId\(response\)/)
  assert.match(
    hook,
    /if \(!entryId\) \{\s*setCompleteModalOpen\(false\);\s*await fetchReservation\(\);\s*await fetchClientDebts\(reservation\.clientId\);\s*Alert\.alert\(t\('common\.error'\), t\('stylist\.dailyLogDetail\.saveResponseFallback'\)\);\s*return;/,
  )
  assert.match(hook, /params: \{ entryId \}/)
})
