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
const pageFieldKeys = [
  'public_reserve_title',
  'public_reserve_subtitle',
  'public_reserve_bg',
  'public_services_bg',
  'public_services_title',
  'public_services_subtitle',
  'public_gallery_bg',
  'public_gallery_title',
  'public_gallery_subtitle',
  'public_blog_bg',
  'public_blog_title',
  'public_blog_subtitle',
  'public_login_image',
  'public_login_title',
  'public_login_subtitle',
  'public_register_image',
  'public_register_title',
  'public_register_subtitle',
]
const leafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? leafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )
const getPath = (resource, key) => key.split('.').reduce((value, part) => value?.[part], resource)

test('public-page and sign-in settings have matching Bosnian/English copy', () => {
  for (const locale of locales) {
    for (const key of pageCopyKeys) {
      assert.notEqual(getPath(locale, key), undefined, `Missing locale key: ${key}`)
    }
  }

  assert.deepEqual(
    leafPaths(locales[0].adminSettings, 'adminSettings').sort(),
    leafPaths(locales[1].adminSettings, 'adminSettings').sort(),
  )
  assert.match(page, /public_pages_:\s*\{/)
  for (const key of pageFieldKeys) {
    assert.ok(
      page.includes(`'${key}': 'adminSettings.site.fields.`) || page.includes(`${key}: 'adminSettings.site.fields.`),
      `Missing page-setting mapping: ${key}`,
    )
    assert.ok(groupDefinitions.includes(`key: '${key}'`), `Missing setting definition: ${key}`)
  }
})

test('public-page display labels preserve saved descriptions and settings API behavior', () => {
  assert.match(page, /\.\.\.group,\s*label: t\(copyKeys\.label\),\s*description: t\(copyKeys\.description\)/)
  assert.match(page, /\.\.\.def,\s*label: t\(SITE_FIELD_COPY_KEYS/)
  assert.doesNotMatch(page, /desc:\s*t\(/)
  assert.match(formEditor, /await onSave\(def\.key, value, def\.desc\)/)
  assert.match(settingsHook, /api\.put\(`\/api\/settings\/\$\{key\}`, \{ value, description: desc \}\)/)
})
