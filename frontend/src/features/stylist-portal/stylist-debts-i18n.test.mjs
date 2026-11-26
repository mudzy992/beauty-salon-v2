import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)
// S10: dialog copy and repayment feedback moved to focused component/hook modules.
const source = [
  readFileSync(new URL('./pages/stylist-debts-page.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('./components/stylist-debt-repayment-dialog.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('./hooks/useStylistDebtRepayment.ts', import.meta.url), 'utf8'),
].join('\n')
const keys = new Set([...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key))
const hasLocaleKey = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource) !== undefined

test('stylist debt UI uses keys present in both locales', () => {
  assert.ok(keys.has('stylistPortal.debts.title'))
  assert.ok(keys.has('stylistPortal.debts.dialogDescription'))
  assert.ok(keys.has('stylistPortal.debts.loadFailed'))

  for (const resource of locales) {
    for (const key of keys) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }
})
