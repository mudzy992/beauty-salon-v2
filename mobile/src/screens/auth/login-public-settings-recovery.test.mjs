import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const screen = readFileSync(new URL('./LoginScreen.tsx', import.meta.url), 'utf8')
const translations = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')

test('login public settings failures are visible and can be retried without blocking authentication', () => {
  assert.match(screen, /const loadPublicSettings = useCallback/)
  assert.match(screen, /setSettingsLoadError\(true\)/)
  assert.doesNotMatch(screen, /\.catch\(\(\) => \{\}\)/)
  assert.match(screen, /accessibilityRole="alert"/)
  assert.match(screen, /auth\.loginPublicSettingsLoadError/)
  assert.match(screen, /onPress=\{\(\) => void loadPublicSettings\(\)\}/)
  assert.match(screen, /loading=\{settingsLoading\}/)
  assert.match(screen, /onPress=\{handleLogin\}/)
  assert.match(screen, /getSettingValue\(settings, 'public_login_title', t\('auth\.loginTitle'\)\)/)
})

test('login settings requests ignore stale responses after unmount', () => {
  assert.match(screen, /settingsRequestGeneration\.current !== generation/)
  assert.match(screen, /settingsRequestGeneration\.current \+= 1/)
})

test('login public-settings recovery copy uses Bosnian translation resources', () => {
  assert.ok(
    translations.includes(
      "loginPublicSettingsLoadError: 'Postavke izgleda prijave trenutno nisu dostupne. Prikazujemo zadani izgled.'",
    ),
  )
  assert.match(translations, /common:[\s\S]*?retry:/)
})
