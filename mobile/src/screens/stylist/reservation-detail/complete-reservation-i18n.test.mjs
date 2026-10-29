import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../../i18n/bs.ts', import.meta.url), 'utf8')
const modal = readFileSync(new URL('./complete-reservation-modal.tsx', import.meta.url), 'utf8')
const completionTranslations = resource.match(/complete:\s*\{([\s\S]*?)\n\s*\},\n\s*actions:/)?.[1]

test('stylist reservation completion copy uses Bosnian translation resources', () => {
  assert.ok(completionTranslations, 'Missing stylist reservation completion resources')
  for (const key of [
    'chargedLabel',
    'amountDue',
    'payDebtsIntent',
    'tipAmount',
    'recordDebt',
    'clientDebtsTitle',
    'noOpenDebts',
    'serviceFallback',
    'stylistFallback',
    'debtWithYou',
    'debtWithStylist',
    'selectedDebtsExplanation',
    'selectedDebtsTotal',
    'notesLabel',
  ]) {
    assert.match(completionTranslations, new RegExp(`\\b${key}:`), `Missing completion translation: ${key}`)
    assert.ok(
      modal.includes(`t('stylist.reservationDetail.complete.${key}'`),
      `Completion modal missing key: ${key}`,
    )
  }
  assert.doesNotMatch(
    modal,
    /Naplaćeno \(KM\)|Za naplatu:|klijent želi platiti dug|Napojnica:|Zavedi dug|Dugovanja klijenta|Nema otvorenih dugovanja|Dug kod vas|Odabrana dugovanja|Ukupno za dugovanja|Napomena \(opciono\)/,
  )
})

test('reservation completion calculations and interactions remain unchanged', () => {
  assert.match(modal, /parseFloat\(actualPrice\.replace\(',', '\.'\)\) \|\| 0/)
  assert.match(modal, /Math\.max\(0, paidRaw - completeChargeAmount\)/)
  assert.match(modal, /Math\.max\(0, completeChargeAmount - paidRaw\)/)
  assert.match(modal, /onPress=\{onToggleCreateDebt\}/)
  assert.match(modal, /onPress=\{\(\) => onToggleDebt\(d\.id\)\}/)
  assert.match(modal, /onChangeText=\{onActualPriceChange\}/)
  assert.match(modal, /onChangeText=\{onNotesChange\}/)
  assert.match(modal, /onPress=\{onSubmit\}/)
  assert.match(modal, /clientDebts\.slice\(0, 6\)/)
})
