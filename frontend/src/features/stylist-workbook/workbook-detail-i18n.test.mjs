import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL(`../../i18n/locales/${language}.json`, import.meta.url), 'utf8')),
)

const hasLocaleKey = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource) !== undefined

test('stylist workbook detail and disposition UI use keys present in both locales', () => {
  const sources = [
    './pages/workbook-detail-page.tsx',
    './components/daily-log-disposition-panel.tsx',
    './components/disposition-copy.ts',
  ].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'))
  const keys = new Set(
    sources.flatMap((source) => [
      ...[...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key),
      ...[...source.matchAll(/'(stylistWorkbook\.[A-Za-z0-9_.]+)'/g)].map(([, key]) => key),
    ]),
  )

  assert.ok(keys.has('stylistWorkbook.detail.finishWithReservation'))
  assert.ok(keys.has('stylistWorkbook.disposition.reasonRequired'))
  assert.ok(keys.has('stylistWorkbook.disposition.actions.noShow.hint'))

  for (const resource of locales) {
    for (const key of keys) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }
})
