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
const formEditor = readFileSync(new URL('./setting-editor-form.tsx', import.meta.url), 'utf8')
const booleanEditor = readFileSync(new URL('./setting-editor-boolean.tsx', import.meta.url), 'utf8')
const settingsHook = readFileSync(new URL('./use-admin-settings.ts', import.meta.url), 'utf8')
const pageCopyKeys = [...page.matchAll(/'adminSettings\.[^']+'/g)].map(([key]) => key.slice(1, -1))
const homeFieldKeys = [
  'public_hero_title',
  'public_hero_subtitle',
  'public_hero_image',
  'public_hero_cta_text_web',
  'public_hero_cta_text',
  'public_cta_title',
  'public_cta_subtitle',
  'public_about_title',
  'public_about_text',
  'public_about_image',
  'public_highlight_1_title',
  'public_highlight_1_text',
  'public_highlight_2_title',
  'public_highlight_2_text',
  'public_highlight_3_title',
  'public_highlight_3_text',
]
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

test('homepage-section settings have matching Bosnian/English group and field copy', () => {
  for (const locale of locales) {
    for (const key of pageCopyKeys) {
      assert.notEqual(getPath(locale, key), undefined, `Missing locale key: ${key}`)
    }
  }

  assert.deepEqual(
    leafPaths(locales[0].adminSettings, 'adminSettings').sort(),
    leafPaths(locales[1].adminSettings, 'adminSettings').sort(),
  )
  assert.match(page, /public_home_:\s*\{/)
  for (const key of homeFieldKeys) {
    assert.ok(
      page.includes(`'${key}': 'adminSettings.site.fields.`) || page.includes(`${key}: 'adminSettings.site.fields.`),
      `Missing homepage field mapping: ${key}`,
    )
    assert.ok(groupDefinitions.includes(`key: '${key}'`), `Missing setting definition: ${key}`)
  }
  assert.match(page, /public_hero_cta_text_web: 'adminSettings\.site\.placeholders\.webHeroCtaText'/)
  assert.match(groupDefinitions, /placeholder: 'Rezervišite termin'/)
  assert.equal(getPath(locales[0], 'adminSettings.site.placeholders.webHeroCtaText'), 'Rezervišite termin')
  assert.equal(getPath(locales[1], 'adminSettings.site.placeholders.webHeroCtaText'), 'Book an appointment')
})

test('homepage display labels and placeholder localization preserve setting storage and API behavior', () => {
  assert.match(groupsHook, /\.\.\.def,\s*\.\.\.\(fieldKey \? { label: t\(fieldKey\) } : {}\)/)
  assert.match(groupsHook, /placeholderKey \? \{ placeholder: t\(placeholderKey\) \} : \{\}/)
  assert.doesNotMatch(page, /desc:\s*t\(/)
  assert.match(booleanEditor, /onSave\(def\.key, checked \? 'true' : 'false', def\.desc\)/)
  assert.match(formEditor, /await onSave\(def\.key, value, def\.desc\)/)
  assert.match(settingsHook, /api\.put\(`\/api\/settings\/\$\{key\}`, \{ value, description: desc \}\)/)
})
