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

test('settings load state is announced and failures offer a localized retry', () => {
  assert.match(page, /role="status" aria-live="polite"/)
  assert.match(page, /<span className="sr-only">\{t\('common\.loading'\)\}<\/span>/)
  assert.match(page, /loadError \? \([\s\S]*?role="alert"[\s\S]*?adminSettings\.editor\.loadFailed[\s\S]*?void loadData\(\)/)
  assert.match(hook, /if \(requestId === loadRequestId\.current\) setLoadError\(true\)/)
  assert.match(hook, /if \(requestId !== loadRequestId\.current\) return/)
  assert.doesNotMatch(hook, /catch \(\) => \{\s*setSettingsList\(\[\]\)/)
})

test('settings form controls are associated with localized labels', () => {
  assert.match(form, /<Label htmlFor=\{inputId\}[\s\S]*?\{displayLabel\}/)
  for (const type of ['Textarea', 'select', 'type="number"', 'type="url"', "def.type === 'email'"]) {
    assert.ok(form.includes(type), `Expected settings control branch for ${type}`)
  }
  assert.match(form, /<Textarea id=\{inputId\}/)
  assert.match(form, /<select\s+id=\{inputId\}/)
  assert.match(form, /<Input id=\{inputId\} type="number"/)
  assert.match(form, /<Input id=\{inputId\} type="url"/)
  assert.match(form, /<Input id=\{inputId\} type=\{def\.type === 'email' \? 'email' : 'text'\}/)
  assert.match(form, /<Label htmlFor=\{fileInputId\}>\{t\('adminSettings\.editor\.chooseImage'\)\}<\/Label>/)
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

test('new settings recovery and input labels exist in Bosnian and English', () => {
  for (const locale of locales) {
    for (const key of ['loadFailed', 'chooseImage', 'colorPicker']) {
      assert.equal(typeof locale.adminSettings.editor[key], 'string')
      assert.ok(locale.adminSettings.editor[key].length > 0)
    }
  }
})
