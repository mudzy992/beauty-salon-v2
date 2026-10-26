import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL(`../../i18n/locales/${language}.json`, import.meta.url), 'utf8')),
)

const hasLocaleKey = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource) !== undefined

test('stylist workbook list UI references keys present in both locales', () => {
  const sources = [
    './pages/workbook-list-page.tsx',
    './hooks/useWorkbookEntries.tsx',
  ].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'))
  const keys = new Set(sources.flatMap((source) => [...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key)))

  assert.ok(keys.has('stylistWorkbook.entriesLoadFailed'))
  assert.ok(keys.has('stylistWorkbook.thisWeek'))
  assert.ok(keys.has('stylistWorkbook.serviceFallback'))

  for (const resource of locales) {
    for (const key of keys) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }
})
