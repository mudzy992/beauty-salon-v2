import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import i18next from 'i18next'
import {
  formatLocalizedAmount,
  formatMonthName,
} from '../../i18n/locale-utils.mjs'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(
    readFileSync(
      new URL('../../i18n/locales/' + language + '.json', import.meta.url),
      'utf8',
    ),
  ),
)
const sourceFiles = [
  'components/book-list.tsx',
  'components/book-period-picker.tsx',
  'income/income-books-tab.tsx',
  'expense/expense-books-tab.tsx',
]
const sources = Object.fromEntries(
  sourceFiles.map((file) => [
    file,
    readFileSync(new URL('./' + file, import.meta.url), 'utf8'),
  ]),
)
const allSources = Object.values(sources).join('\n')
const translationKeys = new Set(
  [...allSources.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key),
)

const leafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? leafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )
const getPath = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource)

const createI18n = async () => {
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
  return instance
}

test('finance book navigation translation keys exist in matching BS/EN resources', () => {
  const [bosnian, english] = locales.map((locale) =>
    leafPaths(locale.finance.book, 'finance.book').sort(),
  )
  assert.deepEqual(bosnian, english)

  for (const locale of locales) {
    for (const key of translationKeys) {
      assert.notEqual(
        getPath(locale, key),
        undefined,
        `Missing locale key: ${key}`,
      )
    }
  }
})

test('month names, period labels and book amounts use the selected locale', async () => {
  assert.equal(formatMonthName(1, 'bs'), 'Januar')
  assert.equal(formatMonthName(3, 'bs'), 'Mart')
  assert.equal(formatMonthName(1, 'en'), 'January')
  assert.equal(formatMonthName(3, 'en'), 'March')
  assert.equal(formatMonthName(0, 'en'), '')
  assert.equal(formatLocalizedAmount(1234.5, 'bs'), '1.234,50 KM')
  assert.equal(formatLocalizedAmount(1234.5, 'en'), '1,234.50 KM')

  const instance = await createI18n()
  assert.equal(
    instance.t('finance.book.openPeriod', { period: 'Mart 2026' }),
    'Otvori knjigu za Mart 2026',
  )
  assert.equal(
    instance.t('finance.book.futureMonthCannotOpen'),
    'Knjiga za budući mjesec se ne može otvoriti.',
  )
  assert.equal(
    instance.t('finance.book.autoOpenHint'),
    'Knjige se otvaraju automatski prvog dana u mjesecu.',
  )
  assert.equal(
    instance.t('finance.book.openFailed'),
    'Otvaranje knjige nije uspjelo',
  )

  await instance.changeLanguage('en')
  assert.equal(
    instance.t('finance.book.openPeriod', { period: 'March 2026' }),
    'Open book for March 2026',
  )
  assert.equal(
    instance.t('finance.book.futureMonthCannotOpen'),
    'A book for a future month cannot be opened.',
  )
  assert.equal(
    instance.t('finance.book.autoOpenHint'),
    'Books open automatically on the first day of each month.',
  )
  assert.equal(instance.t('finance.book.openFailed'), 'Could not open the book')
})

test('book period picker keeps numeric values and future-period protection', () => {
  const picker = sources['components/book-period-picker.tsx']
  assert.match(picker, /onMonthChange\(Number\(event\.target\.value\)\)/)
  assert.match(picker, /onYearChange\(Number\(event\.target\.value\)\)/)
  assert.match(picker, /formatMonthName\(value, i18n\.language\)/)
  assert.match(picker, /const isFuture = isFuturePeriod\(year, month\)/)
  assert.match(picker, /disabled=\{isPending \|\| isFuture\}/)
  assert.match(picker, /t\('finance\.book\.futureMonthCannotOpen'\)/)
})

test('book lists and KIF/KUF tabs preserve selection and amount data behavior', () => {
  const list = sources['components/book-list.tsx']
  const income = sources['income/income-books-tab.tsx']
  const expense = sources['expense/expense-books-tab.tsx']

  assert.match(list, /formatPeriod\(row\.year, row\.month, i18n\.language\)/)
  assert.match(
    list,
    /formatLocalizedAmount\(row\.primaryAmount, i18n\.language\)/,
  )
  assert.match(
    list,
    /formatLocalizedAmount\(row\.secondaryAmount, i18n\.language\)/,
  )
  assert.match(list, /onClick=\{\(\) => onOpen\(row\.id\)\}/)
  assert.match(
    list,
    /aria-label=\{t\('finance\.book\.openPeriod', \{ period \}\)\}/,
  )
  assert.match(income, /fetchIncomeBookForMonth\(year, month\)/)
  assert.match(income, /financeKeys\.incomeBooks\(\)/)
  assert.match(income, /primaryAmount: toNumber\(book\.totalRevenue\)/)
  assert.match(income, /secondaryAmount: toNumber\(book\.totalTips\)/)
  assert.match(expense, /fetchExpenseBookForMonth\(year, month\)/)
  assert.match(expense, /financeKeys\.expenseBooks\(\)/)
  assert.match(expense, /primaryAmount: toNumber\(book\.totalExpenses\)/)
  assert.match(
    allSources,
    /toastApiError\(err, t\('finance\.book\.openFailed'\)\)/,
  )
})
