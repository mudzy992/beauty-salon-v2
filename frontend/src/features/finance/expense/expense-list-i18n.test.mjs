import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import i18next from 'i18next'
import { formatLocalizedAmount, getIntlLocale } from '../../../i18n/locale-utils.mjs'
import { formatInstantDateLocale } from '../../../../../shared/business-date.mjs'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)
const files = ['expense-filters.tsx', 'expense-table.tsx', 'expense-invoice-preview.tsx']
const sources = Object.fromEntries(
  files.map((file) => [file, readFileSync(new URL('./' + file, import.meta.url), 'utf8')]),
)
const allSources = Object.values(sources).join('\n')
const leafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? leafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )
const getPath = (resource, key) => key.split('.').reduce((value, part) => value?.[part], resource)
const translationKeys = new Set(
  [...allSources.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key),
)

test('expense list translation references exist with matching BS/EN keys', () => {
  const [bosnian, english] = locales.map((locale) =>
    leafPaths(locale.finance.expenseList, 'finance.expenseList').sort(),
  )
  for (const locale of locales) {
    for (const key of translationKeys) {
      if (key.startsWith('finance.expenseList.')) {
        const exists =
          getPath(locale, key) !== undefined ||
          bosnian.some((candidate) => candidate.startsWith(`${key}_`))
        assert.ok(exists, `Missing locale key: ${key}`)
      }
    }
  }
  assert.deepEqual(bosnian, english)
  assert.match(sources['expense-table.tsx'], /formatLocalizedAmount\(expense\.totalAmount, i18n\.language\)/)
  assert.match(sources['expense-invoice-preview.tsx'], /getIntlLocale\(i18n\.language\)/)
})

test('expense list copy, plurals, dates, and amounts follow the active locale', async () => {
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

  assert.equal(instance.t('finance.expenseList.onlyWithAttachments'), 'Samo rashodi sa prilogom')
  assert.equal(instance.t('finance.expenseList.moreItems', { count: 1 }), '+ još 1 stavka — pogledaj fakturu')
  assert.equal(instance.t('finance.expenseList.moreItems', { count: 2 }), '+ još 2 stavke — pogledaj fakturu')
  assert.equal(instance.t('finance.expenseList.moreItems', { count: 5 }), '+ još 5 stavki — pogledaj fakturu')
  assert.equal(formatLocalizedAmount(1234.5, 'bs'), '1.234,50 KM')

  const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit' }
  const bosnianDate = formatInstantDateLocale('2026-10-28T00:30:00Z', getIntlLocale('bs'), dateOptions)
  await instance.changeLanguage('en')
  assert.equal(instance.t('finance.expenseList.onlyWithAttachments'), 'Expenses with attachments only')
  assert.equal(instance.t('finance.expenseList.moreItems', { count: 1 }), '+ 1 more item — view invoice')
  assert.equal(instance.t('finance.expenseList.moreItems', { count: 3 }), '+ 3 more items — view invoice')
  assert.equal(formatLocalizedAmount(1234.5, 'en'), '1,234.50 KM')
  const englishDate = formatInstantDateLocale('2026-10-28T00:30:00Z', getIntlLocale('en'), dateOptions)
  assert.notEqual(bosnianDate, englishDate)
})

test('expense filter values, sort identifiers, and callbacks remain unchanged', () => {
  const filters = sources['expense-filters.tsx']
  const table = sources['expense-table.tsx']
  assert.match(filters, /update\(\{ search: event\.target\.value \}\)/)
  assert.match(filters, /update\(\{ categoryId: event\.target\.value \}\)/)
  assert.match(filters, /update\(\{ minAmount: event\.target\.value \}\)/)
  assert.match(filters, /update\(\{ maxAmount: event\.target\.value \}\)/)
  assert.match(filters, /update\(\{ onlyWithAttachments: event\.target\.checked \}\)/)
  assert.match(filters, /onChange\(EMPTY_EXPENSE_FILTERS\)/)
  assert.match(table, /field: 'createdAt'/)
  assert.match(table, /field: 'title'/)
  assert.match(table, /field: 'totalAmount'/)
  assert.match(table, /onClick=\{\(\) => onSort\(column\.field\)\}/)
  assert.match(table, /onClick=\{\(\) => onEdit\(expense\)\}/)
  assert.match(table, /onClick=\{\(\) => onDelete\(expense\)\}/)
  assert.match(table, /\{expense\.title\}/)
  assert.match(table, /\{expense\.category\?\.name \?\? '—'/)
})

test('invoice preview keeps API data dynamic and formats business dates locally', () => {
  const preview = sources['expense-invoice-preview.tsx']
  assert.match(preview, /title=\{t\('finance\.expenseList\.previewTitle', \{ title: expense\.title \}\)\}/)
  assert.match(preview, /expense\.category\?\.name \?\? t\('finance\.expenseList\.categoryFallback'\)/)
  assert.match(preview, /name: fv\.field\?\.fieldName \?\? fieldFallback/)
  assert.match(preview, /labelFromLineValues\(fields, item\.values\) \|\| lineFallback/)
  assert.match(preview, /formatInstantDateLocale\([\s\S]*getIntlLocale\(i18n\.language\)/)
  assert.match(preview, /formatLocalizedAmount\(displayTotal, i18n\.language\)/)
  assert.match(preview, /formatLocalizedAmount\(row\.total, i18n\.language\)/)
  assert.match(allSources, /setPreview\(expense\)/)
})
