import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const block = readFileSync(new URL('./DailyLogEntryPricingBlock.tsx', import.meta.url), 'utf8')
const dailyLogTranslations = resource.match(/dailyLogDetail:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]

const messages = [
  ['servicesAmount', 'Servisi: {{amount}} KM'],
  ['loyaltyDiscountAmount', ' − popust lojalnosti {{amount}} KM'],
  ['debtChargeAmount', ' + dugovi {{amount}} KM'],
  ['totalDueAmount', 'Za naplatu: {{amount}} KM'],
  ['paidAmountLabel', 'Naplaćeno (KM)'],
  ['tipPreviewAmount', 'Napojnica: {{amount}} KM'],
  ['shortfallPreviewAmount', 'Dug (pregled): {{amount}} KM'],
  ['createDebtToggle', 'Zavedi dug'],
]

test('daily-log pricing summary, paid amount, and shortfall copy use Bosnian resources', () => {
  assert.ok(dailyLogTranslations, 'Missing mobile daily-log detail resources')
  for (const [key, copy] of messages) {
    assert.ok(dailyLogTranslations.includes(`${key}: '${copy}'`), `Missing pricing resource: ${key}`)
    const usage = key === 'paidAmountLabel'
      ? "label={t('stylist.dailyLogDetail.paidAmountLabel')}"
      : `t('stylist.dailyLogDetail.${key}'`
    assert.ok(block.includes(usage), `Pricing copy does not use ${key}`)
    assert.ok(!block.includes(`'${copy}'`) && !block.includes(`"${copy}"`), `Pricing copy remains hard-coded: ${copy}`)
  }
})

test('summary visibility, amounts, and shortfall debt-toggle callbacks stay unchanged', () => {
  assert.match(block, /servicesAmount'[\s\S]*?amount: servicesSum\.toFixed\(2\)/)
  assert.match(block, /loyaltyDiscount > 0[\s\S]*?loyaltyDiscountAmount'[\s\S]*?amount: loyaltyDiscount\.toFixed\(2\)/)
  assert.match(block, /debtsSum > 0[\s\S]*?debtChargeAmount'[\s\S]*?amount: debtsSum\.toFixed\(2\)/)
  assert.match(block, /totalDueAmount', \{ amount: chargeAmount\.toFixed\(2\) \}/)
  assert.match(block, /tipPreview > 0[\s\S]*?tipPreviewAmount'[\s\S]*?amount: tipPreview\.toFixed\(2\)/)
  assert.match(block, /shortfall > 0[\s\S]*?shortfallPreviewAmount'[\s\S]*?amount: shortfall\.toFixed\(2\)/)
  assert.ok(block.includes('onPress={() => onCreateDebtChange(!createDebt)}'))
  assert.ok(block.includes("name={createDebt ? 'checkbox' : 'square-outline'}"))
})
