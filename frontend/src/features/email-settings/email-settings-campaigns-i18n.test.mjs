import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(
    readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8'),
  ),
)
const source = readFileSync(new URL('../../pages/EmailSettings.tsx', import.meta.url), 'utf8')
const literalTranslationKeys = new Set([...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key))
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
    'emailSettings.campaigns.sendDetails',
  ]) {
    assert.ok(literalTranslationKeys.has(key), `Missing source translation reference: ${key}`)
  }
  assert.match(source, /t\(`emailSettings\.campaigns\.blockTypes\.\$\{block\.type\}`\)/)
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
  assert.match(source, /const getAudiencePayload = \(\) => \(\{\s*roles: campaignRoles,\s*onlyActive: onlyActiveAudience,\s*onlyEmailVerified: onlyVerifiedAudience,\s*\}\)/)
  assert.match(source, /api\.post\('\/api\/notifications\/campaigns\/send',\s*\{[\s\S]*?templateId: selectedCampaign\.id,[\s\S]*?createInAppNotification,[\s\S]*?tags: \['marketing', 'campaign'\],[\s\S]*?audience: getAudiencePayload\(\)/)
  assert.match(source, /CAMPAIGN_KEY = 'system_email_campaign_templates'/)
  assert.match(source, /JSON\.stringify\(normalized\)/)
})

test('campaign default content and interpolation tokens remain template data', () => {
  assert.match(source, /\? 'Naslov kampanje'/)
  assert.match(source, /\? 'Ovdje unesite opis kampanje\.'/)
  assert.match(source, /\? 'Rezerviši termin'/)
  assert.match(source, /name: `Nova kampanja \$\{campaignTemplates\.length \+ 1\}`/)
  for (const token of ['firstName', 'lastName', 'username', 'email', 'appUrl']) {
    assert.ok(source.includes(`'{{${token}}}'`), `Missing campaign interpolation token: ${token}`)
  }
  assert.match(source, /formatLocalizedNumber\(audienceSummary\.total, i18n\.language\)/)
  assert.match(source, /formatLocalizedNumber\(data\?\.delivered \?\? 0, i18n\.language\)/)
})
