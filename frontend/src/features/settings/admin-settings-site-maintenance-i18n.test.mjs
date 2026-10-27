import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)
const page = readFileSync(new URL('../../pages/Settings.tsx', import.meta.url), 'utf8')
const groupDefinitions = readFileSync(new URL('./groups-site.ts', import.meta.url), 'utf8')
const formEditor = readFileSync(new URL('./setting-editor-form.tsx', import.meta.url), 'utf8')
const booleanEditor = readFileSync(new URL('./setting-editor-boolean.tsx', import.meta.url), 'utf8')
const settingsHook = readFileSync(new URL('./use-admin-settings.ts', import.meta.url), 'utf8')
const pageCopyKeys = [...page.matchAll(/'adminSettings\.[^']+'/g)].map(([key]) => key.slice(1, -1))
const leafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? leafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )
const getPath = (resource, key) => key.split('.').reduce((value, part) => value?.[part], resource)

test('site maintenance settings expose matching Bosnian and English labels', () => {
  for (const locale of locales) {
    for (const key of pageCopyKeys) {
      assert.notEqual(getPath(locale, key), undefined, `Missing locale key: ${key}`)
    }
  }

  assert.deepEqual(
    leafPaths(locales[0].adminSettings, 'adminSettings').sort(),
    leafPaths(locales[1].adminSettings, 'adminSettings').sort(),
  )
  assert.match(page, /maintenance_:\s*\{/)
  assert.match(page, /system_maintenance_mode:\s*'adminSettings\.site\.fields\.maintenanceMode'/)
  assert.match(page, /public_maintenance_message:\s*'adminSettings\.site\.fields\.maintenanceMessage'/)
  assert.match(groupDefinitions, /key: 'system_maintenance_mode'/)
  assert.match(groupDefinitions, /key: 'public_maintenance_message'/)
})

test('maintenance display translations preserve stored descriptions and settings requests', () => {
  assert.match(page, /\.\.\.group,\s*label: t\(copyKeys\.label\),\s*description: t\(copyKeys\.description\)/)
  assert.match(page, /\.\.\.def,\s*label: t\(SITE_FIELD_COPY_KEYS/)
  assert.match(booleanEditor, /onSave\(def\.key, checked \? 'true' : 'false', def\.desc\)/)
  assert.match(formEditor, /await onSave\(def\.key, value, def\.desc\)/)
  assert.match(settingsHook, /api\.put\(`\/api\/settings\/\$\{key\}`, \{ value, description: desc \}\)/)
})
