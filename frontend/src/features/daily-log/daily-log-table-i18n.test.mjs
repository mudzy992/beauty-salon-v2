import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import i18next from 'i18next'
import {
  formatLocalizedAmount,
  getIntlLocale,
} from '../../i18n/locale-utils.mjs'
import { formatDateOnlyLocale } from '../../../../shared/business-date.mjs'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(
    readFileSync(
      new URL('../../i18n/locales/' + language + '.json', import.meta.url),
      'utf8',
    ),
  ),
)
const files = [
  'entry-table.tsx',
  'entry-table-actions.tsx',
  'entry-table-helpers.tsx',
  'entry-status-label.ts',
  'entry-detail-dialog.tsx',
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

test('daily-log table, status, action and mobile labels have matching BS/EN keys', () => {
  const [bosnian, english] = locales.map((locale) =>
    leafPaths(locale.dailyLog.table, 'dailyLog.table').sort(),
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

test('daily-log table statuses, actions, data labels and numeric/date values follow the locale', async () => {
  const instance = await createI18n()
  assert.equal(
    instance.t('dailyLog.table.columns.serviceRevenue'),
    'Iznos usluga',
  )
  assert.equal(instance.t('dailyLog.table.sources.reservation'), 'Rezervacija')
  assert.equal(
    instance.t('dailyLog.table.statuses.inProgress'),
    'Na čekanju (termin u toku)',
  )
  assert.equal(instance.t('dailyLog.table.actions.restore'), 'Vrati unos')
  assert.equal(
    instance.t('dailyLog.table.mobile.debtCollection', { amount: '12,50 KM' }),
    '+ naplata duga 12,50 KM',
  )
  assert.equal(
    instance.t('dailyLog.table.mobile.loyaltyDiscount', {
      percent: 10,
      amount: '2,00 KM',
    }),
    'Loyalty popust: 10% (2,00 KM)',
  )
  assert.equal(formatLocalizedAmount(1234.5, 'bs'), '1.234,50 KM')
  const bosnianDate = formatDateOnlyLocale('2024-01-02', getIntlLocale('bs'), {
    dateStyle: 'medium',
  })

  await instance.changeLanguage('en')
  assert.equal(
    instance.t('dailyLog.table.columns.serviceRevenue'),
    'Service revenue',
  )
  assert.equal(instance.t('dailyLog.table.sources.reservation'), 'Reservation')
  assert.equal(
    instance.t('dailyLog.table.statuses.inProgress'),
    'Pending (appointment in progress)',
  )
  assert.equal(instance.t('dailyLog.table.actions.restore'), 'Restore entry')
  assert.equal(
    instance.t('dailyLog.table.mobile.debtCollection', { amount: '12.50 KM' }),
    '+ debt payment 12.50 KM',
  )
  assert.equal(
    instance.t('dailyLog.table.mobile.loyaltyDiscount', {
      percent: 10,
      amount: '2.00 KM',
    }),
    'Loyalty discount: 10% (2.00 KM)',
  )
  assert.equal(formatLocalizedAmount(1234.5, 'en'), '1,234.50 KM')
  const englishDate = formatDateOnlyLocale('2024-01-02', getIntlLocale('en'), {
    dateStyle: 'medium',
  })
  assert.notEqual(bosnianDate, englishDate)
})

test('table data, status conditions, action callbacks and navigation remain unchanged', () => {
  const table = sources['entry-table.tsx']
  const actions = sources['entry-table-actions.tsx']
  const status = sources['entry-status-label.ts']
  const helpers = sources['entry-table-helpers.tsx']
  const detail = sources['entry-detail-dialog.tsx']

  for (const callback of [
    'onView(entry)',
    'onEdit(entry)',
    'onComplete(entry.id)',
    'onDelete(entry)',
    'onRestore(entry)',
  ]) {
    assert.ok(
      actions.includes(callback),
      `Missing action callback: ${callback}`,
    )
  }
  assert.match(actions, /entry\.status !== 'COMPLETED'/)
  assert.match(actions, /if \(entry\.deletedAt\)/)
  assert.match(
    table,
    /\/admin\/stylist-analytics\?stylistId=\$\{e\.stylistProfile\.id\}/,
  )
  assert.match(table, /\/admin\/client-analytics\?userId=\$\{e\.client\.id\}/)
  assert.match(table, /e\.isManual\s*\?\s*'dailyLog\.table\.sources\.manual'/)
  assert.match(table, /getServiceAmount\(e\)/)
  assert.match(table, /getSettledDebtsSum\(e\)/)
  assert.match(table, /getTipAmount\(e\)/)
  assert.match(table, /getTotalAmount\(e\)/)

  assert.match(
    status,
    /if \(entry\.deletedAt\) return 'dailyLog\.table\.statuses\.deleted'/,
  )
  assert.match(status, /entry\.status === 'COMPLETED'/)
  assert.match(status, /entry\.reservation\?\.status === 'IN_PROGRESS'/)
  assert.match(status, /if \(entry\.deletedAt\) return 'secondary'/)
  assert.match(status, /if \(entry\.status === 'COMPLETED'\) return 'success'/)

  assert.match(
    helpers,
    /formatDateOnlyLocale\(dateOnly, getIntlLocale\(language\)/,
  )
  assert.match(helpers, /formatLocalizedNumber\(value, language/)
  assert.match(
    helpers,
    /formatLocalizedAmount\(getTotalAmount\(entry\), language\)/,
  )
  assert.match(helpers, /entry\.reservation\.loyaltyDiscountPercent/)
  assert.match(helpers, /Number\(entry\.loyaltyDiscountPercent \?\? 0\)/)
  assert.match(detail, /<LoyaltyDiscountLine entry=\{entry\} \/>/)
})
