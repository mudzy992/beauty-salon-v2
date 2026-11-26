import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL(`../../i18n/locales/${language}.json`, import.meta.url), 'utf8')),
)

// S10 (2026-11-18): forma je podijeljena na tanku stranicu + kartice + hook, pa se
// ključevi sakupljaju iz **svih** fajlova te kompozicije — ne samo iz stranice.
const SOURCES = [
  './pages/workbook-new-entry-page.tsx',
  './hooks/useWorkbookNewEntryForm.ts',
  './components/new-entry-client-card.tsx',
  './components/new-entry-service-card.tsx',
  './components/new-entry-payment-card.tsx',
  './components/new-entry-loyalty-card.tsx',
  './components/new-entry-partial-payment-dialog.tsx',
]

const sources = SOURCES.map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'))
const keys = new Set(sources.flatMap((source) => [...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key)))
const hasLocaleKey = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource) !== undefined

test('stylist workbook new-entry UI uses keys present in both locales', () => {
  assert.ok(keys.has('stylistWorkbook.newEntry.title'))
  assert.ok(keys.has('stylistWorkbook.newEntry.partialPaymentDescription'))
  assert.ok(keys.has('stylistWorkbook.newEntry.createFailed'))

  for (const resource of locales) {
    for (const key of keys) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }
})
