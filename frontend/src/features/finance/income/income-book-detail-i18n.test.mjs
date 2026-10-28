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
const sourceFiles = [
  'income-book-detail.tsx',
  'integrity-panel.tsx',
  '../components/book-lock-controls.tsx',
  '../components/confirm-dialog.tsx',
  '../components/data-state.tsx',
  '../components/export-menu.tsx',
  '../components/history-panel.tsx',
  '../components/summary-cards.tsx',
  '../finance.utils.ts',
  '../export.utils.ts',
]
const sources = Object.fromEntries(
  sourceFiles.map((file) => [
    file,
    readFileSync(new URL('./' + file, import.meta.url), 'utf8'),
  ]),
)
const allSources = Object.values(sources).join('\n')
const leafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? leafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )
const translationKeys = new Set(
  [...allSources.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key),
)
const getPath = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource)
const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit' }

test('KIF detail translation sections have matching BS/EN leaves', () => {
  for (const section of [
    'incomeDetail',
    'integrity',
    'export',
    'confirm',
    'history',
    'states',
  ]) {
    const [bosnian, english] = locales.map((locale) =>
      leafPaths(locale.finance[section], `finance.${section}`).sort(),
    )
    assert.deepEqual(
      bosnian,
      english,
      `BS/EN key mismatch in finance.${section}`,
    )
  }

  for (const locale of locales) {
    for (const key of translationKeys) {
      if (key.startsWith('finance.')) {
        const isPluralBase = leafPaths(
          locale.finance.integrity,
          'finance.integrity',
        ).some((candidate) => candidate.startsWith(`${key}_`))
        assert.ok(
          getPath(locale, key) !== undefined || isPluralBase,
          `Missing locale key: ${key}`,
        )
      }
    }
  }
})

test('KIF detail copy and integrity plurals follow the selected language', async () => {
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

  assert.equal(instance.t('finance.export.downloadCsv'), 'Preuzmi CSV')
  assert.equal(
    instance.t('finance.incomeDetail.entryAdded'),
    'Stavka je dodana.',
  )
  assert.equal(
    instance.t('finance.integrity.moreItems', { count: 1 }),
    '…i još 1 zapis',
  )
  assert.equal(
    instance.t('finance.integrity.moreItems', { count: 2 }),
    '…i još 2 zapisa',
  )
  assert.equal(formatLocalizedAmount(1234.5, 'bs'), '1.234,50 KM')
  const bsDate = formatDateOnlyLocale(
    '2026-03-01',
    getIntlLocale('bs'),
    dateOptions,
  )

  await instance.changeLanguage('en')
  assert.equal(instance.t('finance.export.downloadCsv'), 'Download CSV')
  assert.equal(instance.t('finance.incomeDetail.entryAdded'), 'Entry added.')
  assert.equal(
    instance.t('finance.integrity.moreItems', { count: 1 }),
    '…and 1 more entry',
  )
  assert.equal(
    instance.t('finance.integrity.moreItems', { count: 3 }),
    '…and 3 more entries',
  )
  assert.equal(formatLocalizedAmount(1234.5, 'en'), '1,234.50 KM')
  const enDate = formatDateOnlyLocale(
    '2026-03-01',
    getIntlLocale('en'),
    dateOptions,
  )
  assert.notEqual(bsDate, enDate)
})

test('KIF export and print text localize while preserving report data contracts', () => {
  const detail = sources['income-book-detail.tsx']
  const report = sources['../export.utils.ts']
  assert.match(
    detail,
    /filename: `KIF-\$\{book\.year\}-\$\{String\(book\.month\)/,
  )
  assert.match(detail, /header: t\('finance\.incomeList\.columns\.date'\)/)
  assert.match(detail, /value: \(r\) => r\.amount\.toFixed\(2\)/)
  assert.match(detail, /summary\.revenue\.toFixed\(2\)/)
  assert.match(
    detail,
    /title: t\('finance\.incomeDetail\.printTitle', \{ period \}\)/,
  )
  assert.match(
    detail,
    /language: i18n\.language\.startsWith\('en'\) \? 'en' : 'bs'/,
  )
  assert.match(detail, /formatLocalizedAmount\(r\.amount, i18n\.language\)/)
  assert.match(
    detail,
    /mutations\.saveManualEntry\.mutateAsync\(\{[\s\S]*entryId: editing\?\.id,[\s\S]*payload,/,
  )
  assert.match(
    detail,
    /mutations\.removeManualEntry\.mutateAsync\(pendingDelete\.id\)/,
  )
  assert.match(report, /language\?: 'bs' \| 'en'/)
  assert.match(report, /params\.language === 'en' \? 'en' : 'bs'/)
})

test('shared KIF controls retain reason and locked-book guards with localized labels', () => {
  const controls = sources['../components/book-lock-controls.tsx']
  const confirm = sources['../components/confirm-dialog.tsx']
  const history = sources['../components/history-panel.tsx']
  const states = sources['../components/data-state.tsx']
  const integrity = sources['integrity-panel.tsx']
  const summaries = sources['../components/summary-cards.tsx']

  assert.match(controls, /const canUnlock = isPastPeriod\(year, month\)/)
  assert.match(controls, /disabled=\{isPending \|\| !canUnlock\}/)
  assert.match(controls, /onUnlock\(reason\)/)
  assert.match(confirm, /reason\.trim\(\)\.length >= minReasonLength/)
  assert.match(confirm, /onConfirm\(reason\.trim\(\)\)/)
  assert.match(
    history,
    /ACTION_KEYS\[event\.action\]\s*\?\s*t\(ACTION_KEYS\[event\.action\]\)\s*:\s*event\.action/,
  )
  assert.match(
    history,
    /formatLocalizedDateTime\(event\.createdAt, i18n\.language\)/,
  )
  assert.match(states, /t\('finance\.states\.loading'\)/)
  assert.match(states, /t\('finance\.states\.retry'\)/)
  assert.match(integrity, /report\.missingCount > 0 && !report\.isLocked/)
  assert.match(
    integrity,
    /formatLocalizedAmount\(entry\.actualPrice, i18n\.language\)/,
  )
  assert.match(
    summaries,
    /formatLocalizedAmount\(item\.value, i18n\.language\)/,
  )
})
