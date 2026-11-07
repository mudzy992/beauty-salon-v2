import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const screen = readFileSync(new URL('./HomeScreen.tsx', import.meta.url), 'utf8')

test('home contact links and details navigation expose localized names, roles, and action hints', () => {
  assert.match(screen, /t\('home\.contactSectionTitle'\)/)
  assert.match(screen, /accessibilityRole="button"\s+accessibilityLabel=\{t\('home\.contactDetailsLabel'\)\}\s+accessibilityHint=\{t\('home\.contactDetailsHint'\)\}/)
  assert.match(screen, /t\('home\.contactDetailsAction'\)/)

  assert.match(screen, /accessibilityRole="link"\s+accessibilityLabel=\{t\('home\.phoneContactLabel', \{ phone \}\)\}\s+accessibilityHint=\{t\('home\.phoneContactHint'\)\}/)
  assert.match(screen, /openExternal\(`tel:\$\{phone\}`/)
  assert.match(screen, /accessibilityRole="link"\s+accessibilityLabel=\{t\('home\.emailContactLabel', \{ email \}\)\}\s+accessibilityHint=\{t\('home\.emailContactHint'\)\}/)
  assert.match(screen, /openExternal\(`mailto:\$\{email\}`/)

  assert.equal((screen.match(/accessibilityRole="link"\s+accessibilityHint=\{t\('home\.socialContactHint'/g) ?? []).length, 3)
  for (const network of ['Facebook', 'Instagram', 'TikTok']) {
    assert.ok(screen.includes(`network: '${network}'`), `Missing hint context for ${network}`)
  }
})
