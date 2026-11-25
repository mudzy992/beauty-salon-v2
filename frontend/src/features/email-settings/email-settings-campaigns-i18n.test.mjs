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
  './use-email-campaign-audience.ts',
  './use-email-campaign-settings.ts',
  './email-smtp-panel.tsx',
  './email-templates-panel.tsx',
  './email-campaigns-panel.tsx',
  './email-campaign-editor.tsx',
  './email-campaign-audience.tsx',
  './email-campaign-progress.tsx',
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
const literalTranslationKeys = new Set([...`${source}\n${editor}`.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key))
const getLeafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? getLeafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )

test('campaign controls, audience feedback, and editor labels use matching locale keys', () => {
  for (const key of [
    'emailSettings.campaigns.newTemplate',
    'emailSettings.campaigns.audienceHeading',
    'emailSettings.campaigns.calculateAudience',
    'emailSettings.campaigns.sendCampaign',
    'emailSettings.campaigns.saveTemplates',
    'emailSettings.campaigns.noTemplates',
  ]) {
    assert.ok(literalTranslationKeys.has(key), `Missing source translation reference: ${key}`)
  }
  assert.match(editor, /t\(`emailSettings\.campaigns\.blockTypes\.\$\{block\.type\}`\)/)
  assert.match(source, /t\(`users\.roleNames\.\$\{role\}`\)/)

  const [bosnian, english] = locales.map((resource) => {
    assert.ok(resource.users.roleNames.CLIENT)
    assert.ok(resource.users.roleNames.STYLIST)
    assert.ok(resource.users.roleNames.SYSTEM_ADMIN)
    assert.ok(resource.users.roleNames.OWNER)
    return getLeafPaths(resource.emailSettings.campaigns, 'emailSettings.campaigns').sort()
  })
  assert.deepEqual(bosnian, english)
})

test('campaign UI localization preserves audience and send API contracts', () => {
  assert.match(source, /api\.post<CampaignAudienceSummary>\(\s*'\/api\/notifications\/campaigns\/audience',\s*getAudiencePayload\(\)/)
  assert.match(source, /const getAudiencePayload = \(\) => \(\{\s*roles: campaignRoles,\s*onlyActive: onlyActiveAudience,\s*\}\)/)
  assert.match(source, /const requestPayload = \{[\s\S]*?templateId: selectedCampaign\.id,[\s\S]*?createInAppNotification,[\s\S]*?tags: \['marketing', 'campaign'\],[\s\S]*?audience: audience\.getAudiencePayload\(\)/)
  assert.match(source, /api\.post<\{\s*queued: boolean;[\s\S]*?totalTargeted: number;\s*\}>/)
  assert.match(source, /'\/api\/notifications\/campaigns\/send'/)
  assert.match(source, /\.\.\.requestPayload,\s*idempotencyKey: requestId/)
  assert.match(source, /campaignRequestId\.current\?\.fingerprint === fingerprint[\s\S]*?crypto\.randomUUID\(\)/)
  assert.match(source, /idempotencyKey: requestId/)
  assert.match(source, /api\.get<CampaignJobSummary>\(\s*`\/api\/notifications\/campaigns\/\$\{campaignJobId\}`/)
  assert.match(source, /confirmAtLeastOnce: true, requestId: crypto\.randomUUID\(\)/)
  assert.match(source, /CAMPAIGN_KEY = 'system_email_campaign_templates'/)
  assert.match(source, /JSON\.stringify\(normalized\)/)
})

test('campaign consent and queue feedback copy exists in both locales', () => {
  for (const resource of locales) {
    for (const key of [
      'verifiedConsentOnly',
      'queued',
      'enqueueDetails',
      'progressHeading',
      'statusLabel',
      'counts',
      'cancelRemaining',
      'retryFailed',
      'retryConfirmAtLeastOnce',
      'progressLoadFailed',
    ]) {
      assert.ok(resource.emailSettings.campaigns[key], `Missing campaign key: ${key}`)
    }
    for (const key of ['title', 'description', 'optIn', 'saved', 'loadFailed', 'saveFailed']) {
      assert.ok(resource.notifications.campaignConsent[key], `Missing consent key: ${key}`)
    }
  }
})

test('campaign default content uses localized examples and interpolation tokens remain template data', () => {
  assert.match(source, /content:\s*type === 'spacer' \|\| type === 'divider'[\s\S]*?t\(`emailSettings\.templates\.blockPlaceholders\.\$\{type\}`\)/)
  assert.match(source, /name: `Nova kampanja \$\{campaignTemplates\.length \+ 1\}`/)
  for (const token of ['firstName', 'lastName', 'username', 'email', 'appUrl']) {
    assert.ok(source.includes(`'{{${token}}}'`), `Missing campaign interpolation token: ${token}`)
  }
  assert.match(source, /audienceSummary\.maxRecipients \+ 1/)
  assert.match(source, /formatLocalizedNumber\([\s\S]*?audienceSummary\.total,[\s\S]*?i18n\.language/)
  assert.match(source, /audienceSummary\.exceedsLimit \? '\+' : ''/)
  assert.match(source, /formatLocalizedNumber\(data\.totalTargeted, i18n\.language\)/)
  assert.match(source, /formatLocalizedNumber\(counts\.delivered, i18n\.language\)/)
})
