import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)
const files = {
  operationsPage: readFileSync(new URL('../../pages/SettingsOperations.tsx', import.meta.url), 'utf8'),
  appearancePage: readFileSync(new URL('../../pages/SettingsAppearance.tsx', import.meta.url), 'utf8'),
  operationsGroups: readFileSync(new URL('./groups-operations.ts', import.meta.url), 'utf8'),
  appearanceGroups: readFileSync(new URL('./groups-appearance.ts', import.meta.url), 'utf8'),
  booleanEditor: readFileSync(new URL('./setting-editor-boolean.tsx', import.meta.url), 'utf8'),
  formEditor: readFileSync(new URL('./setting-editor-form.tsx', import.meta.url), 'utf8'),
  settingsHook: readFileSync(new URL('./use-admin-settings.ts', import.meta.url), 'utf8'),
}
const combinedPages = `${files.operationsPage}\n${files.appearancePage}`
const pageCopyKeys = [...combinedPages.matchAll(/'adminSettings\.[^']+'/g)].map(([key]) => key.slice(1, -1))
const leafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? leafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )
const getPath = (resource, key) => key.split('.').reduce((value, part) => value?.[part], resource)
const definitionKeys = (source) => [...source.matchAll(/key: '([^']+)'/g)].map(([, key]) => key)
const groupPrefixes = (source) => [...source.matchAll(/prefix: '([^']+)'/g)].map(([, prefix]) => prefix)

test('operations and appearance panels have BS/EN copy for every group and field', () => {
  for (const locale of locales) {
    for (const key of pageCopyKeys) {
      assert.notEqual(getPath(locale, key), undefined, `Missing locale key: ${key}`)
    }
  }

  assert.deepEqual(
    leafPaths(locales[0].adminSettings, 'adminSettings').sort(),
    leafPaths(locales[1].adminSettings, 'adminSettings').sort(),
  )

  for (const prefix of groupPrefixes(files.operationsGroups)) {
    assert.ok(
      files.operationsPage.includes(`'${prefix}': {`) || files.operationsPage.includes(`${prefix}: {`),
      `Missing translated operations group: ${prefix}`,
    )
  }
  for (const key of definitionKeys(files.operationsGroups)) {
    assert.ok(
      files.operationsPage.includes(`'${key}': 'adminSettings.operations.fields.`) ||
        files.operationsPage.includes(`${key}: 'adminSettings.operations.fields.`),
      `Missing operations field mapping: ${key}`,
    )
  }
  for (const prefix of groupPrefixes(files.appearanceGroups)) {
    assert.ok(
      files.appearancePage.includes(`'${prefix}': {`) || files.appearancePage.includes(`${prefix}: {`),
      `Missing translated appearance group: ${prefix}`,
    )
  }
  for (const key of definitionKeys(files.appearanceGroups)) {
    assert.ok(
      files.appearancePage.includes(`'${key}': 'adminSettings.appearance.fields.`) ||
        files.appearancePage.includes(`${key}: 'adminSettings.appearance.fields.`),
      `Missing appearance field mapping: ${key}`,
    )
  }
})

test('translated display labels do not change persisted setting descriptions or API payloads', () => {
  assert.match(files.operationsPage, /\.\.\.def,\s*label: t\(/)
  assert.match(files.appearancePage, /\.\.\.def,\s*label: t\(/)
  assert.match(files.booleanEditor, /const displayLabel = def\.label \?\? def\.desc/)
  assert.match(files.booleanEditor, /<p[^>]*>\{displayLabel\}<\/p>/)
  assert.match(files.booleanEditor, /onSave\(def\.key, checked \? 'true' : 'false', def\.desc\)/)
  assert.match(files.formEditor, /await onSave\(def\.key, value, def\.desc\)/)
  assert.match(files.settingsHook, /api\.put\(`\/api\/settings\/\$\{key\}`, \{ value, description: desc \}\)/)
})
