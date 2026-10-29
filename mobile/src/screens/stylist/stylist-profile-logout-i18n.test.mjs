import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./StylistProfileScreen.tsx', import.meta.url), 'utf8')
const profileTranslations = resource.match(/profile:\s*\{([\s\S]*?)\n\s*\},\n\s*stats:/)?.[1]

test('stylist profile logout labels and confirmation use Bosnian resources', () => {
  assert.ok(profileTranslations, 'Missing stylist profile resources')
  for (const [key, copy] of [
    ['logoutButton', 'Odjavi se'],
    ['logoutConfirmMessage', 'Da li ste sigurni da se želite odjaviti?'],
    ['logoutConfirmButton', 'Odjavi se'],
  ]) {
    assert.ok(profileTranslations.includes(`${key}: '${copy}'`), `Missing profile resource: ${key}`)
    assert.ok(screen.includes(`t('stylist.profile.${key}')`), `Profile screen missing key: ${key}`)
  }
  assert.match(screen, /Alert\.alert\(t\('auth\.logout'\), t\('stylist\.profile\.logoutConfirmMessage'\)/)
  assert.match(screen, /text: t\('common\.cancel'\)/)
})

test('logout confirmation destructive action and button trigger are unchanged', () => {
  assert.match(screen, /style: 'destructive',[\s\S]*?onPress: logout/)
  assert.match(screen, /onPress=\{handleLogout\}/)
  assert.match(screen, /variant="ghost"/)
})
