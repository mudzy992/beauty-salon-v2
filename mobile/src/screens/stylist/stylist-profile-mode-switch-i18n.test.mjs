import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./StylistProfileScreen.tsx', import.meta.url), 'utf8')
const profileTranslations = resource.match(/profile:\s*\{([\s\S]*?)\n\s*\},\n\s*stats:/)?.[1]

test('stylist profile role and client-mode copy use Bosnian resources', () => {
  assert.ok(profileTranslations, 'Missing stylist profile resources')
  for (const [key, copy] of [
    ['role', 'Stilist'],
    ['switchToClient', 'Prebaci na klijentsku aplikaciju'],
    ['switchToClientHint', 'Prikazat će se klijentska aplikacija (početna, usluge, rezervacije).'],
  ]) {
    assert.ok(profileTranslations.includes(`${key}: '${copy}'`), `Missing profile resource: ${key}`)
    assert.ok(screen.includes(`t('stylist.profile.${key}')`), `Profile screen missing key: ${key}`)
  }
  assert.doesNotMatch(screen, />Stilist<|Prebaci na Client app|Prikazat će se klijentska aplikacija/)
})

test('client-mode visibility and switch navigation remain unchanged', () => {
  assert.match(screen, /const canSwitchToClient = user && isClient\(user\)/)
  assert.match(screen, /\{canSwitchToClient && \(/)
  assert.match(screen, /onPress=\{handleSwitchToClient\}/)
  assert.match(screen, /setMode\('client'\)/)
  assert.match(screen, /router\.replace\('\/'\)/)
})
