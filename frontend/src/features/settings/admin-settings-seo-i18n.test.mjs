import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)
const files = {
  // S9: mape ključeva za kopiju su u `settings-copy-keys.ts` (vidi komentar ispod).
  page: [
    readFileSync(new URL('../../pages/SettingsSeo.tsx', import.meta.url), 'utf8'),
    readFileSync(new URL('./settings-copy-keys.ts', import.meta.url), 'utf8'),
    readFileSync(new URL('./settings-copy-keys-site.ts', import.meta.url), 'utf8'),
  ].join('\n'),
  shell: readFileSync(new URL('./settings-shell.tsx', import.meta.url), 'utf8'),
  modulePage: readFileSync(new URL('./settings-module-page.tsx', import.meta.url), 'utf8'),
  display: readFileSync(new URL('./setting-editor-display.tsx', import.meta.url), 'utf8'),
  form: [
    readFileSync(new URL('./setting-editor-form.tsx', import.meta.url), 'utf8'),
    readFileSync(new URL('./setting-editor-field.tsx', import.meta.url), 'utf8'),
  ].join('\n'),
  hook: readFileSync(new URL('./use-admin-settings.ts', import.meta.url), 'utf8'),
  groups: readFileSync(new URL('./groups-seo.ts', import.meta.url), 'utf8'),
}
const translationKeys = Object.values(files).flatMap((source) =>
  [...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key),
)
// S9: generičko mapiranje grupe/polja na lokalizovanu kopiju preseljeno je u
// `features/settings/use-settings-groups.ts` — garancija je ista, fajl je drugi.
const groupsHook = readFileSync(new URL('./use-settings-groups.ts', import.meta.url), 'utf8')
const leafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? leafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )
const getPath = (resource, key) => key.split('.').reduce((value, part) => value?.[part], resource)
const settingKeys = [...files.groups.matchAll(/key: '(seo_[a-z_]+)'/g)].map(([, key]) => key)

test('SEO settings and shared settings controls have matching BS/EN copy', () => {
  for (const locale of locales) {
    for (const key of translationKeys) {
      assert.notEqual(getPath(locale, key), undefined, `Missing locale key: ${key}`)
    }
  }
  assert.deepEqual(
    leafPaths(locales[0].adminSettings, 'adminSettings').sort(),
    leafPaths(locales[1].adminSettings, 'adminSettings').sort(),
  )
  for (const key of settingKeys) {
    assert.ok(files.page.includes(`${key}: 'adminSettings.seo.fields.`), `Missing display translation mapping for ${key}`)
  }
  // S9: lookup polja je generički (`fieldCopyKeys[def.key]`), a SEO tab i dalje
  // prosljeđuje BAŠ SEO mapu — to je sada jača garancija nego prije.
  assert.match(groupsHook, /const fieldKey = fieldCopyKeys\[def\.key\]/)
  assert.match(files.page, /fieldCopyKeys: SEO_FIELD_COPY_KEYS/)
  assert.match(groupsHook, /\.\.\.\(fieldKey \? { label: t\(fieldKey\) } : {}\)/)
})

test('localized labels do not alter persisted setting descriptions, keys, or API calls', () => {
  assert.match(groupsHook, /label: t\(copyKeys\.label\)/)
  assert.match(groupsHook, /description: t\(copyKeys\.description\)/)
  assert.match(groupsHook, /\.\.\.def,\s*\.\.\.\(fieldKey \? { label: t\(fieldKey\) } : {}\)/)
  assert.match(files.form, /await onSave\(def\.key, value, def\.desc\)/)
  assert.match(files.hook, /api\.put\(`\/api\/settings\/\$\{key\}`, \{ value, description: desc \}\)/)
  assert.match(files.groups, /key: 'seo_default_title'/)
  assert.match(files.groups, /key: 'seo_page_reserve_description'/)
  assert.match(files.display, /const displayLabel = def\.label \?\? def\.desc/)
  assert.match(files.form, /const displayLabel = def\.label \?\? def\.desc/)
})
