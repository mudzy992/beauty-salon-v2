import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(
    readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8'),
  ),
)
// S9 (2026-11-25): objave verzija su razdvojene u `features/app-releases/*`
// (tipovi, hook, lista) + `pages/AppReleases.tsx` (orkestrator). Test čita sve
// te fajlove ZAJEDNO, pa tvrdnje i dalje pokrivaju isti kod.
const sources = [
  readFileSync(new URL('../../pages/AppReleases.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('./app-release-list.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('./app-release-create-form.tsx', import.meta.url), 'utf8'),
]
const joined = sources.join('\n')
const keys = new Set(
  sources.flatMap((source) =>
    [...source.matchAll(/\bt\('([^']+)'/g)]
      .map(([, key]) => key)
      .filter((key) => key.startsWith('appReleases.')),
  ),
)
const hasLocaleKey = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource) !== undefined
const getLeafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? getLeafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )

test('app release page and form use keys present in both locales', () => {
  assert.ok(keys.has('appReleases.minSupportedValue'))
  assert.ok(keys.has('appReleases.status.draft'))
  assert.ok(keys.has('appReleases.status.published'))
  assert.ok(keys.has('appReleases.status.retired'))
  assert.match(joined, /statusLabels\[r\.status\]/)
  assert.match(joined, /formatLocalizedNumber\(r\.apkSizeBytes/)
  assert.doesNotMatch(joined, /\{r\.status\}<\/Badge>/)

  for (const resource of locales) {
    for (const key of keys) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }
})

test('app-release translations have matching Bosnian and English keys', () => {
  const [bosnian, english] = locales.map((resource) =>
    getLeafPaths(resource.appReleases, 'appReleases').sort(),
  )
  assert.deepEqual(bosnian, english)
})
