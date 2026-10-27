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

test('existing email-template UI uses keys present in both locales', () => {
  assert.ok(keys.has('emailSettings.templates.selectorLabel'))
  assert.ok(keys.has('emailSettings.templates.saveExisting'))
  assert.match(source, /t\(`emailSettings\.templates\.types\.\$\{item\.id\}`\)/)

  for (const resource of locales) {
    for (const key of keys) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }
})

test('template configuration save behavior and default email copy remain unchanged', () => {
  assert.match(source, /`system_email_template_\$\{existingTemplateType\}`/)
  assert.match(source, /JSON\.stringify\(existingTemplate\)/)
  assert.match(source, /EXISTING_TEMPLATE_TYPES\.map\(\(item\) => \([\s\S]*?t\(`emailSettings\.templates\.types\.\$\{item\.id\}`\)/)
  assert.match(source, /body: 'Zaprimljena je nova rezervacija\./)
  assert.match(source, /plainText: 'Vaš verifikacijski kod je validan 24 sata\.'/)
  assert.doesNotMatch(
    source,
    /Tip template-a|Premium Salon Design Aktiviran|<Label>Subject<\/Label>|<Label>Naslov<\/Label>|<Label>Plain Text fallback<\/Label>|Sačuvaj postojeći template/,
  )
})

test('template translations preserve all template-type identifiers and matching leaf keys', () => {
  const expectedTypes = [
    'general',
    'holiday',
    'reservation_cancelled',
    'reservation_confirmed',
    'reservation_new',
    'reservation_reminder',
    'reservation_reschedule',
    'verification',
  ]
  const [bosnian, english] = locales.map((resource) => {
    assert.deepEqual(Object.keys(resource.emailSettings.templates.types).sort(), expectedTypes)
    return getLeafPaths(resource.emailSettings.templates, 'emailSettings.templates').sort()
  })
  assert.deepEqual(bosnian, english)
})
