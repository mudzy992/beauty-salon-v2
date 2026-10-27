import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)
const sources = [
  readFileSync(new URL('../../pages/Loyalty.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('./loyalty-program-settings.tsx', import.meta.url), 'utf8'),
]
const translationKeys = new Set(
  sources.flatMap((source) => [...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key)),
)
const leafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? leafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )

test('loyalty account and settings UI references matching BS/EN keys', () => {
  const [bosnian, english] = locales.map((resource) => {
    const paths = leafPaths(resource.loyaltyAdmin, 'loyaltyAdmin').sort()
    for (const key of translationKeys) {
      if (key.startsWith('loyaltyAdmin.')) {
        assert.ok(paths.includes(key), `Missing loyalty locale key: ${key}`)
      }
    }
    return paths
  })
  assert.deepEqual(bosnian, english)
  assert.match(sources[0], /formatLocalizedNumber\(a\.points, i18n\.language\)/)
  assert.match(sources[0], /formatLocalizedNumber\(a\._count\.transactions, i18n\.language\)/)
  assert.match(sources[0], /formatLocalizedNumber\(redeemTarget\.points, i18n\.language\)/)
  assert.match(sources[0], /t\(isActive \? 'loyaltyAdmin\.accountActivated' : 'loyaltyAdmin\.accountDeactivated'\)/)
  assert.match(sources[0], /t\(a\.isActive \? 'loyaltyAdmin\.active' : 'loyaltyAdmin\.inactive'\)/)
})

test('loyalty endpoints, settings keys, and idempotency payloads remain unchanged', () => {
  const [page, settings] = sources
  assert.match(page, /\.get<LoyaltyAccountRow\[]>\('\/api\/loyalty\/accounts'\)/)
  assert.match(page, /\.patch\(`\/api\/loyalty\/accounts\/\$\{id\}`, \{ isActive \}\)/)
  assert.match(page, /\.post\(`\/api\/loyalty\/accounts\/\$\{redeemTarget\.id\}\/redeem`, \{\s*points: redeemPoints,\s*reason: redeemReason,\s*idempotencyKey: redeemIdempotencyKey,/)
  assert.match(page, /\.post\(`\/api\/loyalty\/accounts\/\$\{adjustTarget\.id\}\/adjust`, \{\s*pointsDelta: adjustDelta,\s*note: adjustNote,\s*idempotencyKey: adjustIdempotencyKey,/)
  assert.match(settings, /api\.get<SettingRow\[]>\('\/api\/loyalty\/settings'\)/)
  assert.match(settings, /fetchAllPublicServices<ServiceOpt>\(\)/)
  for (const key of [
    'loyalty_enabled',
    'loyalty_points_per_currency',
    'loyalty_earn_on_tip',
    'loyalty_min_amount_for_earn',
    'loyalty_redeem_enabled',
    'loyalty_redeem_rate',
    'loyalty_min_points_to_redeem',
    'loyalty_max_discount_percent',
    'loyalty_excluded_services',
    'loyalty_tiers',
  ]) {
    assert.ok(settings.includes(`put('${key}'`), `Missing existing settings key: ${key}`)
  }
  assert.match(settings, /put\('loyalty_enabled',[\s\S]*?'Loyalty uključen'\)/)
})

test('configured tier, service, and account names remain dynamic content', () => {
  const [page, settings] = sources
  assert.match(page, /\{a\.tier \?\? '-'\}/)
  assert.match(page, /\{userName\(a\.user\)\}/)
  assert.match(settings, /\{s\.name\}/)
  assert.match(settings, /value=\{tier\.name\}/)
  assert.match(settings, /value=\{tier\.id\}/)
})
