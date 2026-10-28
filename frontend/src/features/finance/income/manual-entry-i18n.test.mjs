import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import i18next from 'i18next'
import { formatLocalizedAmount } from '../../../i18n/locale-utils.mjs'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)
const source = readFileSync(new URL('./manual-entry-dialog.tsx', import.meta.url), 'utf8')
const formSource = readFileSync(new URL('./use-manual-entry-form.ts', import.meta.url), 'utf8')
const leafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? leafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )
const getPath = (resource, key) => key.split('.').reduce((value, part) => value?.[part], resource)
const translationKeys = new Set(
  [source, formSource].flatMap((text) => [...text.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key)),
)

test('manual-income dialog and validation keys exist with BS/EN parity', () => {
  const [bosnian, english] = locales.map((locale) => leafPaths(locale.finance.manualEntry, 'finance.manualEntry').sort())
  for (const locale of locales) {
    for (const key of translationKeys) {
      if (key.startsWith('finance.manualEntry.')) {
        assert.notEqual(getPath(locale, key), undefined, `Missing locale key: ${key}`)
      }
    }
  }
  assert.deepEqual(bosnian, english)
  assert.match(source, /formatLocalizedAmount\(value, i18n\.language\)/)
})

test('dialog copy and validation messages change with the active locale', async () => {
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

  assert.equal(instance.t('finance.manualEntry.description'), 'Iznos iznad cijene servisa knjiži se kao napojnica, a manjak se može evidentirati kao dug.')
  assert.equal(instance.t('finance.manualEntry.validation.debtRequiresClientStylist'), 'Za kreiranje duga obavezni su i klijent i stilista.')
  assert.equal(formatLocalizedAmount(1234.5, 'bs'), '1.234,50 KM')
  await instance.changeLanguage('en')
  assert.equal(instance.t('finance.manualEntry.description'), 'Any amount above the service price is recorded as a tip; a shortfall can be recorded as debt.')
  assert.equal(instance.t('finance.manualEntry.validation.debtRequiresClientStylist'), 'A client and stylist are both required to create debt.')
  assert.equal(formatLocalizedAmount(1234.5, 'en'), '1,234.50 KM')
})

test('manual income form preserves debt rules, dynamic data, and payload contract', () => {
  assert.match(formSource, /const debtAmount = Math\.max\(0, servicePrice - paidAmount\)/)
  assert.match(formSource, /const tipAmount = Math\.max\(0, paidAmount - servicePrice\)/)
  assert.match(formSource, /const canCreateDebt = Boolean\(form\.clientId && form\.stylistProfileId\)/)
  assert.match(formSource, /form\.debtHandling === 'CREATE_DEBT' && debtAmount > 0 && !canCreateDebt/)
  assert.match(formSource, /date: form\.date,[\s\S]*serviceId: form\.serviceId,[\s\S]*stylistProfileId: form\.stylistProfileId \|\| undefined,[\s\S]*clientId: form\.clientId \|\| undefined,[\s\S]*paidAmount,[\s\S]*debtHandling: form\.debtHandling,[\s\S]*notes: form\.notes\.trim\(\) \|\| undefined/)
  assert.match(source, /\{getPersonName\(stylist\.user\)\}/)
  assert.match(source, /\{service\.name\} · \{formatAmount\(service\.price \?\? 0\)\}/)
  assert.match(source, /\{getPersonName\(client\)\}/)
  assert.match(source, /value=\{f\.form\.date\}[\s\S]*onChange=\{\(event\) => f\.update\(\{ date: event\.target\.value \}\)\}/)
  assert.match(source, /onClick=\{\(\) => onSubmit\(f\.toPayload\(\)\)\}/)
  assert.doesNotMatch(source, /Uredi ručni prihod|Novi ručni prihod|Odustani|Sačuvaj|Pretraži klijenta|Evidentiraj dug/)
})
