import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)
const page = readFileSync(new URL('../../pages/Settings.tsx', import.meta.url), 'utf8')
const groupDefinitions = readFileSync(new URL('./groups-site.ts', import.meta.url), 'utf8')
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
  assert.match(page, /\.\.\.group,\s*label: t\(copyKeys\.label\),\s*description: t\(copyKeys\.description\)/)
  assert.match(page, /\.\.\.def,\s*label: t\(SITE_FIELD_COPY_KEYS/)
  assert.doesNotMatch(page, /desc:\s*t\(/)
  assert.match(formEditor, /await onSave\(def\.key, value, def\.desc\)/)
  assert.match(settingsHook, /api\.put\(`\/api\/settings\/\$\{key\}`, \{ value, description: desc \}\)/)
})
