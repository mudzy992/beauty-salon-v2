import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import i18next from 'i18next'
import {
  formatLocalizedAmount,
  getIntlLocale,
} from '../../../i18n/locale-utils.mjs'
import { formatDateOnlyLocale } from '../../../../../shared/business-date.mjs'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(
    readFileSync(
      new URL('../../../i18n/locales/' + language + '.json', import.meta.url),
      'utf8',
    ),
  ),
)
const filters = readFileSync(
  new URL('./income-entry-filters.tsx', import.meta.url),
  'utf8',
)
const table = readFileSync(
  new URL('./income-entries-table.tsx', import.meta.url),
  'utf8',
)
const sources = `${filters}\n${table}`
const leafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? leafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )
const getPath = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource)
const translationKeys = new Set(
  [...sources.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key),
)

const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit' }

test('income list translation references exist with matching BS/EN keys', () => {
  const [bosnian, english] = locales.map((locale) =>
    leafPaths(locale.finance.incomeList, 'finance.incomeList').sort(),
  )
  for (const locale of locales) {
    for (const key of translationKeys) {
      if (key.startsWith('finance.incomeList.')) {
        assert.notEqual(
          getPath(locale, key),
          undefined,
          `Missing locale key: ${key}`,
        )
      }
    }
  }
  assert.deepEqual(bosnian, english)
  for (const key of [
    'finance.filters.all',
    'finance.filters.fromDailyLog',
    'finance.filters.manual',
    'finance.filters.search',
    'finance.filters.stylist',
    'finance.filters.amountFrom',
    'finance.filters.amountTo',
    'finance.filters.clear',
  ]) {
    for (const locale of locales)
      assert.notEqual(
        getPath(locale, key),
        undefined,
        `Missing locale key: ${key}`,
      )
  }
  assert.match(filters, /t\(kind\.labelKey\)/)
  assert.match(table, /t\(column\.labelKey\)/)
})

test('income list copy, date, and amount formatting follow the active locale', async () => {
  const instance = i18next.createInstance()
  await instance.init({
    lng: 'bs',
    fallbackLng: false,
    resources: {
      bs: { translation: locales[0] },
      en: { translation: locales[1] },
    },
    interpolation: { escapeValue: false },
  })

  assert.equal(instance.t('finance.incomeList.noEntries'), 'Nema stavki')
  assert.equal(instance.t('finance.filters.fromDailyLog'), 'Iz dnevnika')
  assert.equal(
    instance.t('finance.incomeList.resultCount', {
      resultCount: 2,
      totalCount: 5,
    }),
    'Prikazano 2 od 5',
  )
  assert.equal(formatLocalizedAmount(1234.5, 'bs'), '1.234,50 KM')
  const bosnianDate = formatDateOnlyLocale(
    '2026-03-01',
    getIntlLocale('bs'),
    dateOptions,
  )

  await instance.changeLanguage('en')
  assert.equal(instance.t('finance.incomeList.noEntries'), 'No entries')
  assert.equal(instance.t('finance.filters.fromDailyLog'), 'From daily log')
  assert.equal(
    instance.t('finance.incomeList.resultCount', {
      resultCount: 2,
      totalCount: 5,
    }),
    'Showing 2 of 5',
  )
  assert.equal(formatLocalizedAmount(1234.5, 'en'), '1,234.50 KM')
  const englishDate = formatDateOnlyLocale(
    '2026-03-01',
    getIntlLocale('en'),
    dateOptions,
  )
  assert.notEqual(bosnianDate, englishDate)
})

test('income filters, sorting identifiers, callbacks, and data remain unchanged', () => {
  assert.match(filters, /value: 'ALL', labelKey: 'finance\.filters\.all'/)
  assert.match(
    filters,
    /value: 'AUTO', labelKey: 'finance\.filters\.fromDailyLog'/,
  )
  assert.match(filters, /value: 'MANUAL', labelKey: 'finance\.filters\.manual'/)
  assert.match(filters, /update\(\{ search: event\.target\.value \}\)/)
  assert.match(filters, /update\(\{ stylistName: event\.target\.value \}\)/)
  assert.match(filters, /update\(\{ minAmount: event\.target\.value \}\)/)
  assert.match(filters, /update\(\{ maxAmount: event\.target\.value \}\)/)
  assert.match(filters, /update\(\{ kind: kind\.value \}\)/)
  assert.match(filters, /onChange\(EMPTY_INCOME_FILTERS\)/)
  assert.match(filters, /aria-pressed=\{filters\.kind === kind\.value\}/)

  assert.match(table, /field: 'date'/)
  assert.match(table, /field: 'serviceName'/)
  assert.match(table, /field: 'amount'/)
  assert.match(table, /field: 'tipAmount'/)
  assert.match(table, /onClick=\{\(\) => onSort\(column\.field\)\}/)
  assert.match(
    table,
    /onClick=\{\(\) =>\s*onEdit\(row\.manualEntry as IncomeBookManualEntry\)\s*\}/,
  )
  assert.match(
    table,
    /onClick=\{\(\) =>\s*onDelete\(row\.manualEntry as IncomeBookManualEntry\)\s*\}/,
  )
  assert.match(table, /row\.manualEntry && !isLocked/)
  assert.match(table, /\{row\.stylistName\}/)
  assert.match(table, /\{row\.clientName\}/)
  assert.match(
    table,
    /formatDateOnlyLocale\(\s*value\.slice\(0, 10\),\s*getIntlLocale\(language\),\s*DATE_OPTIONS,\s*\)/,
  )
  assert.match(
    table,
    /const formatIncomeDate = \(value: string, language: string\): string/,
  )
  assert.match(table, /catch \{\s+return '—'/)
  assert.match(table, /formatLocalizedAmount\(row\.amount, i18n\.language\)/)
  assert.match(table, /formatLocalizedAmount\(row\.tipAmount, i18n\.language\)/)
})
