import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL(`../../i18n/locales/${language}.json`, import.meta.url), 'utf8')),
)

// S10 (2026-11-18): pregled promjene termina je podijeljen na stranicu + hook
// + tri komponente, pa se ključevi sakupljaju iz **svih** tih fajlova.
const HERE = dirname(fileURLToPath(import.meta.url))
const read = (rel) => readFileSync(resolve(HERE, rel), 'utf8')
const source = [
  read('pages/workbook-reschedule-preview-page.tsx'),
  read('hooks/useReschedulePreview.ts'),
  read('components/reschedule-options-card.tsx'),
  read('components/reschedule-proposal-list.tsx'),
  read('components/reschedule-confirm-dialog.tsx'),
].join('\n')

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
