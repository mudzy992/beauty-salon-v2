import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./hooks/useCompleteReservationDialogState.ts', import.meta.url), 'utf8')

test('completion draft resets once per open transition and honors pay-debts intent', () => {
  assert.match(source, /if \(!open\)[\s\S]*?wasOpen\.current = false/)
  assert.match(source, /if \(wasOpen\.current\) return/)
  assert.match(source, /const shouldSelectDebts = !!reservation\.payDebtsIntent/)
  assert.match(source, /setSelectedDebtIds\([\s\S]*?Object\.fromEntries\(debts\.map/)
  assert.match(source, /setActualPrice\(String\(minimumCharge \+ debtsSum\)\)/)
})

test('completion amount calculations and validations preserve payment/debt semantics', () => {
  assert.match(source, /const chargeAmount = minimumCharge \+ selectedDebtSum/)
  assert.match(source, /const shortfall = Math\.max\(0, chargeAmount - paidAmount\)/)
  assert.match(source, /const tipAmount = Math\.max\(0, paidAmount - chargeAmount\)/)
  assert.match(source, /selectedDebtSum > 0 && paidAmount < selectedDebtSum/)
  assert.match(source, /validateCompleteDebtsIntent\(/)
  assert.match(source, /debtHandling: shortfall > 0 && createDebt \? 'CREATE_DEBT' : 'IGNORE_DEBT'/)
  assert.match(source, /settledDebtIds: debts\.filter\(\(debt\) => selectedDebtIds\[debt\.id\]\)\.map\(\(debt\) => debt\.id\)/)
  assert.match(source, /notes: notes\.trim\(\) \|\| undefined/)
})
