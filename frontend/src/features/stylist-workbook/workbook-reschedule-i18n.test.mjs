import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL(`../../i18n/locales/${language}.json`, import.meta.url), 'utf8')),
)
const source = readFileSync(new URL('./pages/workbook-reschedule-preview-page.tsx', import.meta.url), 'utf8')
const keys = new Set([...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key))
const hasLocaleKey = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource) !== undefined

test('stylist workbook reschedule UI uses keys present in both locales', () => {
  assert.ok(keys.has('stylistWorkbook.reschedule.title'))
  assert.ok(keys.has('stylistWorkbook.reschedule.confirmDescription'))
  assert.ok(keys.has('stylistWorkbook.reschedule.previewLoadFailed'))

  for (const resource of locales) {
    for (const key of keys) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }
})
