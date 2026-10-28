import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import i18next from 'i18next'
import {
  formatLocalizedAmount,
  getIntlLocale,
} from '../../../i18n/locale-utils.mjs'
import { formatInstantDateLocale } from '../../../../../shared/business-date.mjs'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(
    readFileSync(
      new URL('../../../i18n/locales/' + language + '.json', import.meta.url),
      'utf8',
    ),
  ),
)
const detail = readFileSync(
  new URL('./expense-book-detail.tsx', import.meta.url),
  'utf8',
)
const financeLeaves = locales.map((locale) =>
  leafPaths(locale.finance, 'finance').sort(),
)
const translationKeys = new Set(
  [...detail.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key),
)

function leafPaths(value, prefix) {
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? leafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )
}

const getPath = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource)

test('KUF detail translation references exist with matching BS/EN keys', () => {
  assert.deepEqual(
    leafPaths(locales[0].finance.expenseDetail, 'finance.expenseDetail').sort(),
    leafPaths(locales[1].finance.expenseDetail, 'finance.expenseDetail').sort(),
  )

  for (const locale of locales) {
    for (const key of translationKeys) {
      if (!key.startsWith('finance.')) continue
      const hasPluralVariants = financeLeaves.some((leaves) =>
        leaves.some((candidate) => candidate.startsWith(`${key}_`)),
      )
      assert.ok(
        getPath(locale, key) !== undefined || hasPluralVariants,
        `Missing locale key: ${key}`,
      )
    }
  }
})

test('KUF detail copy, counts, dates and amounts follow the active locale', async () => {
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

  assert.equal(instance.t('finance.expenseDetail.newExpense'), 'Novi rashod')
  assert.equal(
    instance.t('finance.expenseDetail.expensesTitle', { count: 1 }),
    'Rashod (1)',
  )
  assert.equal(
    instance.t('finance.expenseDetail.expensesTitle', { count: 2 }),
    'Rashodi (2)',
  )
  assert.equal(
    instance.t('finance.expenseDetail.deleteDescription', {
      title: 'Najam salona',
    }),
    'Rashod „Najam salona“ i njegovi prilozi bit će trajno uklonjeni.',
  )
  assert.equal(formatLocalizedAmount(1234.5, 'bs'), '1.234,50 KM')

  const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit' }
  const bosnianDate = formatInstantDateLocale(
    '2026-10-28T00:30:00Z',
    getIntlLocale('bs'),
    dateOptions,
  )
  await instance.changeLanguage('en')
  assert.equal(instance.t('finance.expenseDetail.newExpense'), 'New expense')
  assert.equal(
    instance.t('finance.expenseDetail.expensesTitle', { count: 1 }),
    'Expense (1)',
  )
  assert.equal(
    instance.t('finance.expenseDetail.expensesTitle', { count: 3 }),
    'Expenses (3)',
  )
  assert.equal(
    instance.t('finance.expenseDetail.deleteDescription', {
      title: 'Salon rent',
    }),
    'Expense “Salon rent” and its attachments will be permanently removed.',
  )
  assert.equal(formatLocalizedAmount(1234.5, 'en'), '1,234.50 KM')
  const englishDate = formatInstantDateLocale(
    '2026-10-28T00:30:00Z',
    getIntlLocale('en'),
    dateOptions,
  )
  assert.notEqual(bosnianDate, englishDate)
})

test('KUF CSV and print copy localize without changing exported data contracts', () => {
  assert.match(
    detail,
    /filename: `KUF-\$\{book\.year\}-\$\{String\(book\.month\)/,
  )
  assert.match(detail, /header: t\('finance\.expenseList\.columns\.date'\)/)
  assert.match(detail, /header: t\('finance\.expenseList\.columns\.title'\)/)
  assert.match(detail, /header: t\('finance\.expenseForm\.notes'\)/)
  assert.match(detail, /toNumber\(e\.totalAmount\)\.toFixed\(2\)/)
  assert.match(detail, /filteredTotal\.toFixed\(2\)/)
  assert.match(detail, /rows: expenses/)
  assert.match(
    detail,
    /formatInstantDateLocalized\(e\.createdAt, i18n\.language\)/,
  )
  assert.match(
    detail,
    /formatLocalizedAmount\(e\.totalAmount, i18n\.language\)/,
  )
  assert.match(
    detail,
    /title: t\('finance\.expenseDetail\.printTitle', \{ period \}\)/,
  )
  assert.match(
    detail,
    /language: i18n\.language\.startsWith\('en'\) \? 'en' : 'bs'/,
  )
  assert.match(detail, /formatLocalizedAmount\(filteredTotal, i18n\.language\)/)
  assert.match(detail, /formatExpenseNotesSummary\(e\.notes, fields\)/)
})

test('KUF mutations, lock state and delete guards remain unchanged', () => {
  assert.match(
    detail,
    /mutations\.saveExpense\.mutateAsync\(\{\s*expenseId: editing\?\.id,\s*payload,?\s*\}\)/,
  )
  assert.match(
    detail,
    /mutations\.removeExpense\.mutateAsync\(pendingDelete\.id\)/,
  )
  assert.match(detail, /mutations\.lock\.mutateAsync\(\)/)
  assert.match(detail, /mutations\.unlock\.mutateAsync\(reason\)/)
  assert.match(detail, /disabled=\{isLocked\}/)
  assert.match(detail, /onDelete=\{setPendingDelete\}/)
  assert.match(detail, /finally \{\s*setPendingDelete\(null\)/)
  assert.match(
    detail,
    /emptyLabel=\{t\('finance\.incomeDetail\.lockHistoryEmpty'\)\}/,
  )
})
