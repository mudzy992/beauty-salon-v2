import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import i18next from 'i18next'
import { formatLocalizedAmount } from '../../../i18n/locale-utils.mjs'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)
const sourceFiles = [
  'expense-dialog.tsx',
  'use-expense-form.ts',
  'use-expense-uploads.ts',
  'expense-attachments.tsx',
  'expense-attachment-fields.tsx',
  'fixed-fields-editor.tsx',
  'line-items-editor.tsx',
]
const sources = Object.fromEntries(
  sourceFiles.map((name) => [
    name,
    readFileSync(new URL('./' + name, import.meta.url), 'utf8'),
  ]),
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

test('expense form translation references exist with matching BS/EN keys', () => {
  const [bosnian, english] = locales.map((locale) =>
    leafPaths(locale.finance.expenseForm, 'finance.expenseForm').sort(),
  )
  for (const locale of locales) {
    for (const key of translationKeys) {
      if (key.startsWith('finance.expenseForm.')) {
        assert.notEqual(getPath(locale, key), undefined, `Missing locale key: ${key}`)
      }
    }
  }
  assert.deepEqual(bosnian, english)
  assert.match(sources['expense-dialog.tsx'], /formatLocalizedAmount\(value, i18n\.language\)/)
  assert.match(sources['fixed-fields-editor.tsx'], /formatLocalizedAmount\(total, i18n\.language\)/)
  assert.match(sources['line-items-editor.tsx'], /formatLocalizedAmount\(sumLineItems\(items, fields\), i18n\.language\)/)
  for (const locale of locales) {
    assert.ok(getPath(locale, 'finance.expenseForm.validation.missingValues').includes('{{fields}}'))
    assert.ok(getPath(locale, 'finance.expenseForm.openAttachment').includes('{{name}}'))
  }
})

test('expense dialog copy, validation, and amounts follow the active locale', async () => {
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

  assert.equal(instance.t('finance.expenseForm.createTitle'), 'Novi rashod')
  assert.equal(
    instance.t('finance.expenseForm.validation.missingValues', { fields: 'Iznos, Datum' }),
    'Nedostaju vrijednosti: Iznos, Datum.',
  )
  assert.equal(formatLocalizedAmount(1234.5, 'bs'), '1.234,50 KM')
  await instance.changeLanguage('en')
  assert.equal(instance.t('finance.expenseForm.createTitle'), 'New expense')
  assert.equal(
    instance.t('finance.expenseForm.validation.missingValues', { fields: 'Amount, Date' }),
    'Missing values: Amount, Date.',
  )
  assert.equal(formatLocalizedAmount(1234.5, 'en'), '1,234.50 KM')
})

test('expense validation keeps category, field, and attachment requirements intact', () => {
  const form = sources['use-expense-form.ts']
  assert.match(form, /if \(!form\.categoryId\)/)
  assert.match(form, /if \(!form\.title\.trim\(\)\)/)
  assert.match(form, /!Number\.isFinite\(effectiveTotal\) \|\| effectiveTotal <= 0/)
  assert.match(form, /const missing = templateFields\.filter/)
  assert.match(form, /const requiredMissing = templateFields\.some\([\s\S]*?f\.isRequired/)
  assert.match(form, /form\.lineItems\.length === 0 \|\| incomplete\.length === form\.lineItems\.length/)
  assert.match(form, /if \(requiresPerItem\)/)
  assert.match(form, /!findAttachmentForLabel\(params\.editing\?\.attachments/)
  assert.match(form, /totalAmount: effectiveTotal/)
  assert.match(form, /attachmentUploadIds: attachmentUploadIds\.length \? attachmentUploadIds : undefined/)
})

test('expense names and field labels stay dynamic; upload and private-file contracts remain', () => {
  const dialog = sources['expense-dialog.tsx']
  const attachments = sources['expense-attachments.tsx']
  const uploads = sources['use-expense-uploads.ts']
  assert.match(dialog, /\{c\.name\}/)
  assert.match(allSources, /\{field\.fieldName\}/)
  assert.match(dialog, /onSubmit\(f\.toPayload\(uploads\.pendingUploads\.map\(\(u\) => u\.id\)\)\)/)
  assert.match(uploads, /uploadExpenseFile\(file\)/)
  assert.match(uploads, /params\.onError\(err, t\('finance\.expenseForm\.uploadFailed'\)\)/)
  assert.match(attachments, /api\.get<Blob>\(url, \{ responseType: 'blob' \}\)/)
  assert.match(attachments, /upload\?\.pathOriginal\?\.startsWith\('private\/'\)/)
  assert.match(attachments, /t\('finance\.expenseForm\.openAttachment', \{ name \}\)/)
  assert.match(attachments, /t\('finance\.expenseForm\.downloadAttachment', \{ name \}\)/)
  assert.doesNotMatch(allSources, /Uredi rashod|Novi rashod|Odaberite kategoriju|Slanje priloga nije uspjelo|Fiksne stavke|Dodaj stavku|Bez stavki/)
})
