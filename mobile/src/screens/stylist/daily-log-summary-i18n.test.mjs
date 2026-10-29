import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./DailyLogDetailScreen.tsx', import.meta.url), 'utf8')
const dailyLogTranslations = resource.match(/dailyLogDetail:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]

const labels = [
  ['servicesSectionTitle', 'Servisi'],
  ['serviceFallback', 'Usluga'],
  ['debtPaymentSectionTitle', 'Naplata dugovanja'],
  ['debtFallback', 'Dug'],
  ['reservationLabel', 'Rezervacija:'],
  ['totalChargedAmount', 'Ukupno naplaćeno: {{amount}} KM'],
  ['servicesAmount', 'Servisi: {{amount}} KM'],
  ['tipAmount', ' (napojnica {{amount}} KM)'],
  ['settledDebtsAmount', ' · Dugovi: {{amount}} KM'],
]

test('daily-log service and financial summary copy uses Bosnian resources', () => {
  assert.ok(dailyLogTranslations, 'Missing mobile daily-log detail resources')
  for (const [key, copy] of labels) {
    assert.ok(dailyLogTranslations.includes(`${key}: '${copy}'`), `Missing daily-log summary resource: ${key}`)
    assert.ok(screen.includes(`t('stylist.dailyLogDetail.${key}`), `Summary missing translation key: ${key}`)
    assert.ok(!screen.includes(`'${copy}'`) && !screen.includes(`>${copy}<`), `Summary copy remains hard-coded: ${copy}`)
  }
})

test('service/debt rows and amount interpolation retain their existing conditions and values', () => {
  assert.match(screen, /servicesSectionTitle[\s\S]*?entry\.items && entry\.items\.length > 0[\s\S]*?serviceFallback/)
  assert.match(screen, /\(entry\.debtPaymentEntries\?\.length \?\? 0\) > 0[\s\S]*?debtPaymentSectionTitle[\s\S]*?debtFallback/)
  assert.match(screen, /totalChargedAmount', \{\s*amount: getCollectedTotal\(entry\)\.toFixed\(2\)/)
  assert.match(screen, /servicesAmount', \{\s*amount: Number\(entry\.actualPrice\)\.toFixed\(2\)/)
  assert.match(screen, /entry\.tipAmount > 0[\s\S]*?tipAmount', \{\s*amount: Number\(entry\.tipAmount\)\.toFixed\(2\)/)
  assert.match(screen, /getSettledDebtsSum\(entry\) > 0[\s\S]*?settledDebtsAmount', \{\s*amount: getSettledDebtsSum\(entry\)\.toFixed\(2\)/)
})
