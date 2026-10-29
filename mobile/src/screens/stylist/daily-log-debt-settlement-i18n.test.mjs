import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const block = readFileSync(new URL('./DailyLogEntryPricingBlock.tsx', import.meta.url), 'utf8')
const dailyLogTranslations = resource.match(/dailyLogDetail:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]

const messages = [
  ['openDebtsSummary', 'Otvorena dugovanja: {{count}} · {{amount}} KM'],
  ['settleDebtAction', 'Naplati dug'],
  ['selectDebtsHint', 'Označite dugovanja za naplatu'],
  ['serviceFallback', 'Usluga'],
]

test('daily-log debt settlement summary, guidance, and fallback use Bosnian resources', () => {
  assert.ok(dailyLogTranslations, 'Missing mobile daily-log detail resources')
  for (const [key, copy] of messages) {
    assert.ok(dailyLogTranslations.includes(`${key}: '${copy}'`), `Missing debt-settlement resource: ${key}`)
    const usage = key === 'openDebtsSummary'
      ? "t('stylist.dailyLogDetail.openDebtsSummary', {"
      : `t('stylist.dailyLogDetail.${key}')`
    assert.ok(block.includes(usage), `Debt settlement does not use ${key}`)
    assert.ok(!block.includes(`'${copy}'`), `Debt-settlement copy remains hard-coded: ${copy}`)
  }
})

test('debt visibility, summary amounts, selection state, and callbacks stay unchanged', () => {
  assert.match(block, /!editMode && openDebts\.length > 0 \? \([\s\S]*?\) : null/)
  assert.match(block, /count: openDebts\.length,\s*amount: openDebts\.reduce\(\(a, d\) => a \+ Number\(d\.amount \|\| 0\), 0\)\.toFixed\(2\)/)
  assert.ok(block.includes('onPress={() => onSettleDebtsEnabledChange(!settleDebtsEnabled)}'))
  assert.ok(block.includes("name={settleDebtsEnabled ? 'checkbox' : 'square-outline'}"))
  assert.ok(block.includes('settledDebtIds.includes(d.id)'))
  assert.ok(block.includes('onPress={() => onToggleDebt(d.id)}'))
  assert.ok(block.includes('Number(d.amount).toFixed(2)'))
  assert.ok(block.includes('String(d.createdAt).slice(0, 10)'))
})
