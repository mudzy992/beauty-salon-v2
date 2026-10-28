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
const dialog = readFileSync(
  new URL('./entry-detail-dialog.tsx', import.meta.url),
  'utf8',
)
const helpers = readFileSync(
  new URL('./entry-detail-helpers.ts', import.meta.url),
  'utf8',
)
const dialogPrimitive = readFileSync(
  new URL('../../components/ui/dialog.tsx', import.meta.url),
  'utf8',
)
const drawerPrimitive = readFileSync(
  new URL('../../components/ui/drawer.tsx', import.meta.url),
  'utf8',
)
const keyReferences = new Set(
  [...(dialog + helpers).matchAll(/['"](dailyLog(?:\.[\w]+)+)['"]/g)].map(
    ([, key]) => key,
  ),
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

test('daily-log detail keys used by the dialog exist in both locales', () => {
  const [bosnian, english] = locales.map((locale) =>
    leafPaths(locale.dailyLog.detail, 'dailyLog.detail').sort(),
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

test('detail labels, status, source, dates and amounts use the selected language', async () => {
  const instance = await createI18n()
  assert.equal(instance.t('dailyLog.detail.title'), 'Detalji zapisa')
  assert.equal(
    instance.t('dailyLog.detail.debtCollection'),
    'Naplata dugovanja',
  )
  assert.equal(instance.t('dailyLog.detail.notes'), 'Bilješke')
  assert.equal(instance.t('dailyLog.table.statuses.pending'), 'Na čekanju')
  assert.equal(instance.t('dailyLog.table.sources.manual'), 'Ručno')
  assert.equal(instance.t('common.close'), 'Zatvori')
  assert.equal(formatLocalizedAmount(1234.5, 'bs'), '1.234,50 KM')

  await instance.changeLanguage('en')
  assert.equal(instance.t('dailyLog.detail.title'), 'Entry details')
  assert.equal(instance.t('dailyLog.detail.debtCollection'), 'Debt payment')
  assert.equal(instance.t('dailyLog.detail.notes'), 'Notes')
  assert.equal(instance.t('dailyLog.table.statuses.pending'), 'Pending')
  assert.equal(instance.t('dailyLog.table.sources.manual'), 'Manual')
  assert.equal(instance.t('common.close'), 'Close')
  assert.equal(formatLocalizedAmount(1234.5, 'en'), '1,234.50 KM')

  const bosnianDate = formatDateOnlyLocale('2024-01-02', getIntlLocale('bs'), {
    dateStyle: 'medium',
  })
  const englishDate = formatDateOnlyLocale('2024-01-02', getIntlLocale('en'), {
    dateStyle: 'medium',
  })
  assert.notEqual(bosnianDate, englishDate)
})

test('dialog keeps entry data, existing calculations and detail-status semantics', () => {
  for (const expression of [
    "serviceRows(entry, t('dailyLog.detail.serviceFallback'))",
    'getServiceAmount(entry)',
    'getSettledDebtsSum(entry)',
    'getTipAmount(entry)',
    'getTotalAmount(entry)',
    '{entry.notes}',
    '{entry.deleteReason}',
    'clientLabel(entry)',
  ]) {
    assert.ok(
      dialog.includes(expression),
      `Missing entry expression: ${expression}`,
    )
  }

  assert.match(dialogPrimitive, /t\('common\.close'\)/)
  assert.match(drawerPrimitive, /t\('common\.close'\)/)
  assert.match(dialog, /formatDailyLogDate\(entry\.date, i18n\.language\)/)
  assert.match(dialog, /formatDetailKm\(row\.price, i18n\.language\)/)
  assert.match(dialog, /formatDetailKm\(total, i18n\.language\)/)
  assert.match(dialog, /getDailyLogDetailStatusKey\(entry\)/)
  assert.match(
    helpers,
    /entry\.status === 'COMPLETED'[\s\S]*dailyLog\.table\.statuses\.pending/,
  )
  assert.doesNotMatch(helpers, /reservation\?\.status === 'IN_PROGRESS'/)
  assert.match(helpers, /name: item\.service\?\.name \?\? missingServiceLabel/)
  assert.match(helpers, /item\.unitPrice \?\? item\.service\?\.price \?\? 0/)
  assert.match(helpers, /entry\.service\.price \?\? entry\.actualPrice \?\? 0/)
})
