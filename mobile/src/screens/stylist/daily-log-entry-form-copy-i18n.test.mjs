import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./DailyLogNewEntryScreen.tsx', import.meta.url), 'utf8')
const pricingBlock = readFileSync(new URL('./DailyLogEntryPricingBlock.tsx', import.meta.url), 'utf8')
const dateTimeField = readFileSync(new URL('../../components/ui/DateTimeField.tsx', import.meta.url), 'utf8')
const dailyLogTranslations = resource.match(/dailyLogDetail:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]
const commonTranslations = resource.match(/common:\s*\{([\s\S]*?)\n\s*\},\n\s*auth:/)?.[1]

test('remaining daily-log entry form labels and values are defined in Bosnian resources', () => {
  assert.ok(dailyLogTranslations, 'Missing mobile daily-log detail resources')
  const expected = [
    ["dateLabel: 'Datum'", 'dateLabel'],
    ["notesLabel: 'Napomena (opciono)'", 'notesLabel'],
    ["amountPlaceholder: '0.00'", 'amountPlaceholder'],
    ["currencyAmount: '{{amount}} KM'", 'currencyAmount'],
    ["debtServiceAmount: '{{service}} · {{amount}} KM'", 'debtServiceAmount'],
    ["loyaltyTitle: 'Loyalty'", 'loyaltyTitle'],
    ["loyaltyPointsAndMaximum: 'Bodovi: {{points}} · Max: {{maxPercent}}%'", 'loyaltyPointsAndMaximum'],
    ["loyaltyDiscountLabel: 'Popust (%)'", 'loyaltyDiscountLabel'],
    ["loyaltyUnavailable: 'Loyalty nije dostupan.'", 'loyaltyUnavailable'],
    ["createEntry: 'Kreiraj zapis'", 'createEntry'],
    ["saveEntry: 'Sačuvaj izmjene'", 'saveEntry'],
  ]
  for (const [entry, key] of expected) {
    assert.ok(dailyLogTranslations.includes(entry), `Missing daily-log copy resource: ${key}`)
  }

  assert.ok(commonTranslations?.includes("selectDate: 'Odaberite datum'"))
  assert.ok(commonTranslations?.includes("selectTime: 'Odaberite vrijeme'"))
  assert.ok(commonTranslations?.includes("dateDisplay: '{{day}}.{{month}}.{{year}}'"))
})

test('the entry form renders labels and conditional actions through resources', () => {
  for (const key of [
    'loyaltyTitle',
    'loyaltyPointsAndMaximum',
    'loyaltyDiscountLabel',
    'loyaltyUnavailable',
    'saveEntry',
    'createEntry',
  ]) {
    assert.ok(screen.includes(`t('stylist.dailyLogDetail.${key}'`), `Form does not use ${key}`)
  }
  assert.match(screen, /title=\{[\s\S]*?editEntryId[\s\S]*?t\('stylist\.dailyLogDetail\.saveEntry'\)[\s\S]*?t\('stylist\.dailyLogDetail\.createEntry'\)/)
  for (const copy of ['Loyalty', 'Bodovi:', 'Max:', 'Popust (%)', 'Loyalty nije dostupan.', 'Sačuvaj izmjene', 'Kreiraj zapis']) {
    assert.ok(!screen.includes(`>${copy}<`) && !screen.includes(`\"${copy}\"`) && !screen.includes(`'${copy}'`), `Form copy remains hard-coded: ${copy}`)
  }
})

test('pricing labels, currency suffixes, and date-time prompts come from resources', () => {
  for (const key of ['dateLabel', 'notesLabel', 'currencyAmount', 'debtServiceAmount', 'amountPlaceholder']) {
    assert.ok(pricingBlock.includes(`t('stylist.dailyLogDetail.${key}'`), `Pricing block does not use ${key}`)
  }
  assert.ok(dateTimeField.includes("t(mode === 'date' ? 'common.selectDate' : 'common.selectTime')"))
  assert.ok(dateTimeField.includes("t('common.dateDisplay', { day, month, year })"))
  assert.ok(!dateTimeField.includes('Odaberite datum'))
  assert.ok(!dateTimeField.includes('Odaberite vrijeme'))
  assert.ok(!pricingBlock.includes('label="Datum"'))
  assert.ok(!pricingBlock.includes('label="Napomena (opciono)"'))
  assert.ok(!pricingBlock.includes("'0.00'"))
})
