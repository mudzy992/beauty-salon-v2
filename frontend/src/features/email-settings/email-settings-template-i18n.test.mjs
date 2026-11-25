import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(
    readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8'),
  ),
)
// S9 (2026-11-25): admin email postavke su razdvojene u `features/email-settings/*`
// (konstante, tipovi, tri hooka, tri taba) + `pages/EmailSettings.tsx` (orkestrator).
// Test čita sve te fajlove ZAJEDNO, pa svaka tvrdnja i dalje pokriva isti kod —
// promijenjena je samo putanja izvora, ne i garancija.
const EMAIL_FILES = [
  './email-settings-types.ts',
  './email-settings-constants.ts',
  './email-template-defaults.ts',
  './email-campaign-html.ts',
  './email-settings-api.ts',
  './use-email-smtp.ts',
  './use-email-templates.ts',
  './use-email-campaigns.ts',
  './use-email-campaign-job.ts',
  './email-smtp-panel.tsx',
  './email-smtp-connection.tsx',
  './email-smtp-sender.tsx',
  './email-templates-panel.tsx',
  './email-campaigns-panel.tsx',
  '../../pages/EmailSettings.tsx',
]
const source = EMAIL_FILES.map((f) => readFileSync(new URL(f, import.meta.url), 'utf8')).join('\n')
// S9: vizuelni editor je razdvojen u tri modula (orkestrator / blokovi /
// preview). Test čita SVA tri zajedno — svaka tvrdnja i dalje pokriva isti
// kod, promijenjena je samo putanja izvora.
const editor = [
  readFileSync(new URL('./email-visual-editor.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('./email-visual-editor-blocks.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('./email-visual-editor-preview.tsx', import.meta.url), 'utf8'),
].join('\n')
const allSource = `${source}\n${editor}`
const keys = new Set([...allSource.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key))
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
  assert.match(editor, /t\(`emailSettings\.templates\.blockPlaceholders\.\$\{block\.type\}`\)/)
  for (const key of [
    'emailSettings.templates.visualEditorHeading',
    'emailSettings.templates.visualEditorDescription',
    'emailSettings.templates.previewHeading',
    'emailSettings.templates.previewSampleNote',
    'emailSettings.templates.addHighlight',
    'emailSettings.templates.addDivider',
  ]) {
    for (const resource of locales) assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
  }

  for (const resource of locales) {
    for (const key of keys) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }
})

test('template configuration save behavior and verification expiry copy remains accurate', () => {
  assert.match(source, /`system_email_template_\$\{existingTemplateType\}`/)
  assert.match(source, /JSON\.stringify\(existingTemplate\)/)
  assert.match(source, /EXISTING_TEMPLATE_TYPES\.map\(\(item\) => \([\s\S]*?t\(`emailSettings\.templates\.types\.\$\{item\.id\}`\)/)
  assert.match(source, /body: 'Zaprimljena je nova rezervacija\./)
  assert.match(source, /plainText: 'Vaš verifikacijski kod je validan 15 minuta\.'/)
  assert.match(source, /body: 'Vaš verifikacijski kod je prikazan ispod\. Kod važi 15 minuta\.'/)
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
