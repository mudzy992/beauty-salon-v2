import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL(`../../i18n/locales/${language}.json`, import.meta.url), 'utf8')),
)
const page = readFileSync(new URL('./settings-module-page.tsx', import.meta.url), 'utf8')
const hook = readFileSync(new URL('./use-admin-settings.ts', import.meta.url), 'utf8')
const form = readFileSync(new URL('./setting-editor-form.tsx', import.meta.url), 'utf8')
const booleanEditor = readFileSync(new URL('./setting-editor-boolean.tsx', import.meta.url), 'utf8')
const displayEditor = readFileSync(new URL('./setting-editor-display.tsx', import.meta.url), 'utf8')
const settingEditor = readFileSync(new URL('./setting-editor.tsx', import.meta.url), 'utf8')
const groupPanel = readFileSync(new URL('./setting-group-panel.tsx', import.meta.url), 'utf8')
const settingsShell = readFileSync(new URL('./settings-shell.tsx', import.meta.url), 'utf8')
const configuredHelper = readFileSync(new URL('./is-configured.ts', import.meta.url), 'utf8')

test('settings load state is announced and failures offer a localized retry', () => {
  assert.match(page, /role="status" aria-live="polite"/)
  assert.match(page, /<span className="sr-only">\{t\('common\.loading'\)\}<\/span>/)
  assert.match(page, /loadError \? \([\s\S]*?role="alert"[\s\S]*?adminSettings\.editor\.loadFailed[\s\S]*?void loadData\(\)/)
  assert.match(hook, /if \(requestId === loadRequestId\.current\) setLoadError\(true\)/)
  assert.match(hook, /if \(requestId !== loadRequestId\.current\) return/)
  assert.doesNotMatch(hook, /catch \(\) => \{\s*setSettingsList\(\[\]\)/)
})

test('settings header and content width match the shared admin page layout', () => {
  assert.match(settingsShell, /<div className="w-full space-y-6 pb-10">/)
  assert.match(settingsShell, /<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">/)
  assert.doesNotMatch(settingsShell, /max-w-6xl|bg-gradient-to-br|border border-\[#eadfd5\]/)
})

test('settings form controls are associated with localized labels', () => {
  assert.match(form, /<Label htmlFor=\{inputId\}[\s\S]*?\{displayLabel\}/)
  for (const type of ['Textarea', 'select', 'type="number"', 'type="url"', "def.type === 'email'"]) {
    assert.ok(form.includes(type), `Expected settings control branch for ${type}`)
  }
  assert.match(form, /<Textarea\s+id=\{inputId\}/)
  assert.match(form, /<select\s+id=\{inputId\}/)
  assert.match(form, /<Input\s+id=\{inputId\}\s+type="number"/)
  assert.match(form, /<Input\s+id=\{inputId\}\s+type="url"/)
  assert.match(form, /<Input\s+id=\{inputId\}\s+type=\{def\.type === 'email' \? 'email' : 'text'\}/)
  assert.match(form, /<Label htmlFor=\{fileInputId\}[^>]*>\s*\{t\('adminSettings\.editor\.chooseImage'\)\}/)
  assert.match(form, /<Input\s+type="color"\s+aria-label=\{t\('adminSettings\.editor\.colorPicker', \{ label: displayLabel \}\)\}/)
  assert.match(form, /<Input id=\{inputId\} value=\{value\}/)
})

test('boolean settings switches are associated with their translated setting label', () => {
  assert.match(booleanEditor, /<Label htmlFor=\{switchId\}[^>]*>[\s\S]*?\{displayLabel\}/)
  assert.match(booleanEditor, /<Switch\s+id=\{switchId\}/)
})

test('settings save rejection is contained after the hook reports its localized error', () => {
  assert.match(form, /await onSave\(def\.key, value, def\.desc\)[\s\S]*?catch \{[\s\S]*?settings hook already reports a localized save error[\s\S]*?finally/)
  assert.match(booleanEditor, /await onSave\(def\.key, checked \? 'true' : 'false', def\.desc\)[\s\S]*?catch \{[\s\S]*?settings hook already reports a localized save error[\s\S]*?finally/)
})

test('settings editors reflect registry defaults when no explicit value has been saved', () => {
  assert.match(booleanEditor, /setting\?\.value \?\? registry\?\.defaultValue \?\? 'false'/)
  assert.match(displayEditor, /getEffectiveSettingValue\(setting, registry\)/)
  assert.match(configuredHelper, /return row\?\.value \?\? reg\?\.defaultValue \?\? ''/)
  assert.match(configuredHelper, /String\(row\.value \?\? ''\) !== String\(reg\.defaultValue \?\? ''\)/)
  assert.match(settingEditor, /registry\?\.defaultValue/)
  assert.match(groupPanel, /registry=\{registryMap\.get\(def\.key\)\}/)
  assert.match(form, /useState\(setting\?\.value \?\? defaultValue\)/)
  for (const locale of locales) {
    assert.equal(typeof locale.adminSettings.editor.customized, 'string')
    assert.equal(typeof locale.adminSettings.editor.usingDefault, 'string')
  }
})

test('new settings recovery and input labels exist in Bosnian and English', () => {
  for (const locale of locales) {
    for (const key of ['loadFailed', 'chooseImage', 'colorPicker']) {
      assert.equal(typeof locale.adminSettings.editor[key], 'string')
      assert.ok(locale.adminSettings.editor[key].length > 0)
    }
  }
})
