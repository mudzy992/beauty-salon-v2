import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import i18next from 'i18next'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(
    readFileSync(
      new URL('../../../i18n/locales/' + language + '.json', import.meta.url),
      'utf8',
    ),
  ),
)
const files = [
  'expense-categories-tab.tsx',
  'category-wizard-dialog.tsx',
  'category-fields-editor.tsx',
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
      .matchAll(/['"](finance\.expenseCategories(?:\.[\w]+)+)['"]/g),
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

test('expense-category labels and dynamic key maps have matching BS/EN entries', () => {
  const [bosnian, english] = locales.map((locale) =>
    leafPaths(
      locale.finance.expenseCategories,
      'finance.expenseCategories',
    ).sort(),
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

test('category editor copy, field types and line roles follow the active locale', async () => {
  const instance = await createI18n()
  assert.equal(
    instance.t('finance.expenseCategories.title'),
    'Kategorije rashoda',
  )
  assert.equal(
    instance.t('finance.expenseCategories.fieldTypes.currency'),
    'Novčani iznos',
  )
  assert.equal(
    instance.t('finance.expenseCategories.roles.unitPrice'),
    'Jedinična cijena',
  )
  assert.equal(
    instance.t('finance.expenseCategories.bootstrapAdded', {
      names: 'Najam, Režije',
    }),
    'Dodane kolone za: Najam, Režije',
  )
  assert.equal(
    instance.t('finance.expenseCategories.validation.fieldRequired'),
    'Dodajte barem jedno polje ili kolonu.',
  )

  await instance.changeLanguage('en')
  assert.equal(
    instance.t('finance.expenseCategories.title'),
    'Expense categories',
  )
  assert.equal(
    instance.t('finance.expenseCategories.fieldTypes.currency'),
    'Currency amount',
  )
  assert.equal(
    instance.t('finance.expenseCategories.roles.unitPrice'),
    'Unit price',
  )
  assert.equal(
    instance.t('finance.expenseCategories.bootstrapAdded', {
      names: 'Rent, Utilities',
    }),
    'Columns added for: Rent, Utilities',
  )
  assert.equal(
    instance.t('finance.expenseCategories.validation.fieldRequired'),
    'Add at least one field or column.',
  )
})

test('category creation and field editing preserve validation and payload contracts', () => {
  const wizard = sources['category-wizard-dialog.tsx']
  const fields = sources['category-fields-editor.tsx']
  assert.match(wizard, /const error = !form\.name\.trim\(\)/)
  assert.match(wizard, /!editing && form\.draftFields\.length === 0/)
  assert.match(wizard, /name: form\.name\.trim\(\)/)
  assert.match(wizard, /description: form\.description \|\| null/)
  assert.match(
    wizard,
    /requiresAttachmentPerItem: form\.requiresAttachmentPerItem/,
  )
  assert.match(
    wizard,
    /mode: 'update',[\s\S]*categoryId: editing\.id,[\s\S]*templateId: editing\.templateId/,
  )
  assert.match(
    wizard,
    /mode: 'create',[\s\S]*payload: \{ \.\.\.base, fields: form\.draftFields \}/,
  )
  assert.match(fields, /fieldName: fieldName\.trim\(\)/)
  assert.match(fields, /defaultValue: defaultValue\.trim\(\) \|\| undefined/)
  assert.match(fields, /lineRole: isFixed \? 'NONE' : lineRole/)
  assert.match(fields, /onDraftChange\(\[\.\.\.draftFields, payload\]\)/)
  assert.match(fields, /onAddSaved\(payload\)/)
})

test('catalog mutations and bootstrap behavior retain their existing API boundaries', () => {
  const tab = sources['expense-categories-tab.tsx']
  assert.match(tab, /mutations\.createBundle\.mutateAsync\(submit\.payload\)/)
  assert.match(
    tab,
    /mutations\.updateBundle\.mutateAsync\(\{[\s\S]*categoryId: submit\.categoryId,[\s\S]*templateId: submit\.templateId,[\s\S]*payload: submit\.payload/,
  )
  assert.match(
    tab,
    /mutations\.addField\.mutateAsync\(\{ templateId, payload \}\)/,
  )
  assert.match(
    tab,
    /mutations\.removeField\.mutateAsync\(pendingFieldRemoval\)/,
  )
  assert.match(tab, /mutations\.bootstrapLegacy\.mutateAsync\(\)/)
  assert.match(tab, /names\.join\(', '\)/)
  assert.match(tab, /setPendingFieldRemoval\(null\)/)
  assert.match(tab, /sort\(\s*\(a, b\)\s*=> a\.sortOrder - b\.sortOrder,?\s*\)/)
})
