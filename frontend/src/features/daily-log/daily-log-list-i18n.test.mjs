import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import i18next from 'i18next'
import { formatLocalizedAmount } from '../../i18n/locale-utils.mjs'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(
    readFileSync(
      new URL('../../i18n/locales/' + language + '.json', import.meta.url),
      'utf8',
    ),
  ),
)
const files = [
  'entry-filters.tsx',
  'entry-stats.tsx',
  '../../pages/DailyLog.tsx',
]
const sources = Object.fromEntries(
  files.map((file) => [
    file,
    readFileSync(new URL('./' + file, import.meta.url), 'utf8'),
  ]),
)
const keyReferences = new Set(
  [
    ...Object.values(sources)
      .join('\n')
      .matchAll(/['"](dailyLog(?:\.[\w]+)+)['"]/g),
  ].map(([, key]) => key),
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

test('daily-log list overview labels and referenced keys match in BS and EN', () => {
  const [bosnian, english] = locales.map((locale) =>
    leafPaths(locale.dailyLog.list, 'dailyLog.list').sort(),
  )
  assert.deepEqual(bosnian, english)

  for (const locale of locales) {
    for (const key of keyReferences) {
      assert.notEqual(
        getPath(locale, key),
        undefined,
        `Missing locale key: ${key}`,
      )
    }
  }
})

test('daily-log filters, summary cards and create action follow the selected language', async () => {
  const instance = await createI18n()
  assert.equal(instance.t('dailyLog.newEntry'), 'Novi Unos')
  assert.equal(instance.t('dailyLog.list.fromDate'), 'Od datuma')
  assert.equal(instance.t('dailyLog.list.allStylists'), 'Svi stilisti')
  assert.equal(instance.t('dailyLog.list.serviceRevenue'), 'Prihod od servisa')
  assert.equal(instance.t('dailyLog.list.completed'), 'Kompletirano')
  assert.equal(formatLocalizedAmount(1234.5, 'bs'), '1.234,50 KM')

  await instance.changeLanguage('en')
  assert.equal(instance.t('dailyLog.newEntry'), 'New entry')
  assert.equal(instance.t('dailyLog.list.fromDate'), 'From date')
  assert.equal(instance.t('dailyLog.list.allStylists'), 'All stylists')
  assert.equal(instance.t('dailyLog.list.serviceRevenue'), 'Service revenue')
  assert.equal(instance.t('dailyLog.list.completed'), 'Completed')
  assert.equal(formatLocalizedAmount(1234.5, 'en'), '1,234.50 KM')
})

test('filter values, reset defaults, callbacks and summary calculations remain intact', () => {
  const filters = sources['entry-filters.tsx']
  const stats = sources['entry-stats.tsx']
  const page = sources['../../pages/DailyLog.tsx']

  assert.match(
    filters,
    /value=\{fromDate\}\s*onChange=\{\(e\) => onFromDateChange\(e\.target\.value\)\}/,
  )
  assert.match(
    filters,
    /value=\{toDate\}\s*onChange=\{\(e\) => onToDateChange\(e\.target\.value\)\}/,
  )
  assert.match(
    filters,
    /value=\{stylistFilter\}[\s\S]*onStylistFilterChange\(e\.target\.value\)/,
  )
  assert.match(
    filters,
    /checked=\{includeDeleted\}[\s\S]*onCheckedChange=\{onIncludeDeletedChange\}/,
  )
  assert.match(filters, /stylistFilter: '',\s*includeDeleted: false/)
  assert.match(filters, /const range = getCurrentMonthRange\(\)/)
  assert.match(filters, /onClick=\{onReset\}/)

  assert.match(page, /onReset=\{data\.handleResetFilters\}/)
  assert.match(page, /onFromDateChange=\{data\.setFromDate\}/)
  assert.match(page, /onStylistFilterChange=\{data\.setStylistFilter\}/)
  assert.match(page, /onIncludeDeletedChange=\{data\.setIncludeDeleted\}/)
  assert.match(page, /\{t\('dailyLog\.newEntry'\)\}/)

  assert.match(stats, /entries\.filter\(\(e\) => !e\.deletedAt\)/)
  assert.match(stats, /sumEntryTotals\(active\)/)
  assert.match(stats, /active\.filter\(\(e\) => e\.status === 'COMPLETED'\)/)
  assert.match(stats, /formatLocalizedAmount\(total, i18n\.language\)/)
  assert.match(stats, /formatLocalizedAmount\(services, i18n\.language\)/)
  assert.match(stats, /formatLocalizedAmount\(tips, i18n\.language\)/)
})
