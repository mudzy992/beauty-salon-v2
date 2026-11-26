/** Source contract: the web app exposes only Aurum light/dark and fixed theme colors. */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8')
const context = read('../../../context/SettingsContext.tsx')
const appearance = read('../../../pages/SettingsAppearance.tsx')
const groups = read('../../settings/groups-appearance.ts')
const registry = read('../../../../../backend/src/settings/settings-registry.ts')
const bs = JSON.parse(read('../../../i18n/locales/bs.json'))
const en = JSON.parse(read('../../../i18n/locales/en.json'))

const resolveKey = (locale, key) =>
  key.split('.').reduce((acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), locale)

test('theme settings only expose the default Aurum mode; legacy skin/color keys are removed', () => {
  assert.match(context, /setGlobalTheme\(settingsMap\.theme_default_mode\)/)
  assert.doesNotMatch(context, /theme_active_skin|theme_primary|theme_accent|buildBrandColorVariables/)
  assert.match(groups, /theme_default_mode/)
  assert.doesNotMatch(groups, /theme_active_skin|theme_primary|theme_accent/)
  assert.match(registry, /theme_default_mode/)
  assert.doesNotMatch(registry, /theme_active_skin|theme_primary|theme_accent/)
  assert.doesNotMatch(appearance, /theme_active_skin|theme_primary|theme_accent/)
})

test('fixed-palette explanation is visible in both locales on Appearance settings', () => {
  const key = 'adminSettings.appearance.aurumNote'
  for (const locale of [bs, en]) {
    const value = resolveKey(locale, key)
    assert.ok(typeof value === 'string' && value.length > 20, `missing ${key}`)
  }
  assert.match(appearance, /t\('adminSettings\.appearance\.aurumNote'\)/)
  assert.match(appearance, /data-aurum-note/)
})

test('removed legacy settings are not reintroduced by Appearance controls', () => {
  const source = `${context}\n${appearance}\n${groups}\n${registry}`
  const controls = (src) => !/theme_active_skin|theme_primary|theme_accent/.test(src)
  assert.equal(controls(source), true)
  for (const token of ['theme_active_skin', 'theme_primary', 'theme_accent']) {
    assert.equal(controls(`${source}\n${token}`), false, `${token} guard must detect reintroduction`)
  }
})
