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
const settingsHook = readFileSync(new URL('./use-admin-settings.ts', import.meta.url), 'utf8')
const pageCopyKeys = [...page.matchAll(/'adminSettings\.[^']+'/g)].map(([key]) => key.slice(1, -1))
const contactFieldKeys = [
  'public_contact_bg',
  'public_contact_title',
  'public_contact_subtitle',
  'public_contact_address',
  'public_contact_phone',
  'public_contact_email',
  'public_contact_map_embed',
  'public_contact_lat',
  'public_contact_lng',
  'public_social_facebook',
  'public_social_instagram',
  'public_social_tiktok',
  'public_site_base_url',
  'public_footer_text',
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

test('contact and social settings have matching Bosnian/English labels', () => {
  for (const locale of locales) {
    for (const key of pageCopyKeys) {
      assert.notEqual(getPath(locale, key), undefined, `Missing locale key: ${key}`)
    }
  }

  assert.deepEqual(
    leafPaths(locales[0].adminSettings, 'adminSettings').sort(),
    leafPaths(locales[1].adminSettings, 'adminSettings').sort(),
  )
  assert.match(page, /public_contact_:\s*\{/)
  for (const key of contactFieldKeys) {
    assert.ok(
      page.includes(`'${key}': 'adminSettings.site.fields.`) || page.includes(`${key}: 'adminSettings.site.fields.`),
      `Missing contact/social field mapping: ${key}`,
    )
    assert.ok(groupDefinitions.includes(`key: '${key}'`), `Missing setting definition: ${key}`)
  }
})

test('contact/social display translations preserve saved setting descriptions and API behavior', () => {
  assert.match(groupsHook, /\.\.\.group,\s*label: t\(copyKeys\.label\),\s*description: t\(copyKeys\.description\)/)
  assert.match(groupsHook, /\.\.\.def,\s*\.\.\.\(fieldKey \? { label: t\(fieldKey\) } : {}\)/)
  assert.doesNotMatch(page, /desc:\s*t\(/)
  assert.match(formEditor, /await onSave\(def\.key, value, def\.desc\)/)
  assert.match(settingsHook, /api\.put\(`\/api\/settings\/\$\{key\}`, \{ value, description: desc \}\)/)
})
