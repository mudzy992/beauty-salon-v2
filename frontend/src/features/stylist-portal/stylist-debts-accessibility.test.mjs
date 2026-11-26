import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// S10: read-state remains in the page; repayment busy state is in the dialog component.
const source = [
  readFileSync(new URL('./pages/stylist-debts-page.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('./components/stylist-debt-repayment-dialog.tsx', import.meta.url), 'utf8'),
].join('\n')

test('stylist debts announce initial loading separately from retryable errors and empty results', () => {
  assert.match(source, /query\.isLoading \? \([\s\S]*?role="status" aria-live="polite"[\s\S]*?t\('common\.loading'\)/)
  assert.match(source, /query\.isError \? \([\s\S]*?role="alert"[\s\S]*?void query\.refetch\(\)/)
  assert.match(source, /filtered\.length === 0 \? \([\s\S]*?noOpenDebts[\s\S]*?noSearchResults/)
})

test('debt repayment exposes a busy action and a polite progress announcement', () => {
  assert.match(source, /pending \? \([\s\S]*?role="status" aria-live="polite"[\s\S]*?t\('common\.loading'\)/)
  assert.match(source, /onClick=\{onSubmit\} disabled=\{pending\} aria-busy=\{pending\}/)
  assert.match(source, /onSubmit=\{\(\) => void repayment\.submitRepay\(\)\}/)
})

test('repayment keeps the endpoint payload, translated errors and post-success refresh', () => {
  const action = readFileSync(new URL('./hooks/useStylistDebtRepayment.ts', import.meta.url), 'utf8')
  assert.match(action, /api\.post\(`\/api\/client-debts\/\$\{repayDebtId\}\/repay`/)
  assert.match(action, /date: repayDate,[\s\S]*?note: repayNote\.trim\(\) \|\| undefined/)
  assert.match(action, /await refetch\(\)/)
  assert.match(action, /toastApiError\(err, t\('stylistPortal\.debts\.repayFailed'\)\)/)
})
