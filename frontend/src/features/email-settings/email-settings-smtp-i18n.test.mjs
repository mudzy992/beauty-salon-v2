import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(
    readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8'),
  ),
)
const source = readFileSync(new URL('../../pages/EmailSettings.tsx', import.meta.url), 'utf8')
const keys = new Set([...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key))
const hasLocaleKey = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource) !== undefined
const getLeafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? getLeafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )

test('email settings SMTP slice references keys available in both locales', () => {
  assert.ok(keys.has('emailSettings.title'))
  assert.ok(keys.has('emailSettings.smtp.settingsSaved'))
  assert.ok(keys.has('emailSettings.smtp.passwordSavedHint'))

  for (const resource of locales) {
    for (const key of keys) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }
})

test('SMTP translations preserve existing settings/test endpoints and provider values', () => {
  assert.match(source, /api\.post\('\/api\/notifications\/test-email'/)
  assert.match(source, /api\.post\('\/api\/notifications\/test-smtp-connection'/)
  assert.match(source, /upsertSetting\(KEYS\.host, host\.trim\(\)/)
  assert.match(source, /onChange=\{\(event\) => handleProviderChange\(event\.target\.value as ProviderType\)\}/)
  assert.match(source, /EXISTING_TEMPLATE_TYPES\.map\(\(item\) => \([\s\S]*?t\(`emailSettings\.templates\.types\.\$\{item\.id\}`\)/)
  assert.match(source, /toastError\(msg \|\| t\('emailSettings\.smtp\.connectionFailed'\)\)/)
  assert.doesNotMatch(
    source,
    /Email postavke|Konfigurišite SMTP za slanje verifikacijskih|SMTP i infrastruktura|Pool konekcije|Sačuvaj email postavke|Test konekcije|Obrisati sačuvani SMTP password\?/,
  )
})

test('email settings locale resources have matching keys and provider variants', () => {
  const [bosnian, english] = locales.map((resource) =>
    getLeafPaths(resource.emailSettings, 'emailSettings').sort(),
  )
  assert.deepEqual(bosnian, english)
  assert.deepEqual(Object.keys(locales[0].emailSettings.providers).sort(), [
    'custom',
    'exchange',
    'google',
    'office365',
  ])
})
