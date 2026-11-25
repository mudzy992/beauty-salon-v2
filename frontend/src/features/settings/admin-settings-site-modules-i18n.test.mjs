import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)
// S9 (2026-11-25): mape ključeva za kopiju (label/description/placeholder) izdvojene
// su iz `pages/Settings*.tsx` u `features/settings/settings-copy-keys.ts`. Test i dalje
// čita OBA fajla zajedno, pa tvrdnje pokrivaju isti skup ključeva — promijenjena je
// samo putanja izvora, ne i garancija.
const COPY_KEYS = [
  readFileSync(new URL('./settings-copy-keys.ts', import.meta.url), 'utf8'),
  readFileSync(new URL('./settings-copy-keys-site.ts', import.meta.url), 'utf8'),
].join('\n')
const page = [
  readFileSync(new URL('../../pages/Settings.tsx', import.meta.url), 'utf8'),
  COPY_KEYS,
].join('\n')
// S9: `groups-site.ts` je podijeljen u tri modula (indeks + javni sadržaj +
// javni moduli). Test čita SVA tri — tvrdnje i dalje pokrivaju iste
// definicije postavki.
const groupDefinitions = [
  readFileSync(new URL('./groups-site.ts', import.meta.url), 'utf8'),
  readFileSync(new URL('./groups-site-pages.ts', import.meta.url), 'utf8'),
  readFileSync(new URL('./groups-site-modules.ts', import.meta.url), 'utf8'),
].join('\n')
const booleanEditor = readFileSync(new URL('./setting-editor-boolean.tsx', import.meta.url), 'utf8')
const settingsHook = readFileSync(new URL('./use-admin-settings.ts', import.meta.url), 'utf8')
const pageCopyKeys = [...page.matchAll(/'adminSettings\.[^']+'/g)].map(([key]) => key.slice(1, -1))
const moduleKeys = ['public_feature_blog', 'public_feature_gallery', 'public_feature_reviews']
const leafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? leafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )
const getPath = (resource, key) => key.split('.').reduce((value, part) => value?.[part], resource)

test('public module toggles have matching Bosnian/English labels', () => {
  for (const locale of locales) {
    for (const key of pageCopyKeys) {
      assert.notEqual(getPath(locale, key), undefined, `Missing locale key: ${key}`)
    }
  }

  assert.deepEqual(
    leafPaths(locales[0].adminSettings, 'adminSettings').sort(),
    leafPaths(locales[1].adminSettings, 'adminSettings').sort(),
  )
  assert.match(page, /public_feature_:\s*\{/)
  for (const key of moduleKeys) {
    assert.ok(
      page.includes(`${key}: 'adminSettings.site.fields.`),
      `Missing public module translation mapping: ${key}`,
    )
    assert.ok(groupDefinitions.includes(`key: '${key}'`), `Missing setting definition: ${key}`)
  }
})

test('localized module labels do not change saved setting descriptions or API requests', () => {
  assert.match(booleanEditor, /const displayLabel = def\.label \?\? def\.desc/)
  assert.match(booleanEditor, /onSave\(def\.key, checked \? 'true' : 'false', def\.desc\)/)
  assert.match(settingsHook, /api\.put\(`\/api\/settings\/\$\{key\}`, \{ value, description: desc \}\)/)
})
