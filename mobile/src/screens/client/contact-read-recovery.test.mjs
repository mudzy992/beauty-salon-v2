import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const screen = readFileSync(new URL('./ContactScreen.tsx', import.meta.url), 'utf8')

test('contact settings and working-hours failures remain distinct and retryable', () => {
  assert.match(screen, /\.catch\(\(\) => \{\s*if \(generation === settingsRequestGeneration\.current\) setSettingsError\(true\);\s*\}\)/)
  assert.match(screen, /\.catch\(\(\) => \{\s*if \(generation === hoursRequestGeneration\.current\) setWorkingHoursError\(true\);\s*\}\)/)
  assert.match(screen, /onPress=\{loadPublicSettings\}[\s\S]*?loading=\{settingsRetrying\}/)
  assert.match(screen, /onPress=\{loadWorkingHours\}[\s\S]*?loading=\{workingHoursRetrying\}/)
  assert.match(screen, /setSettings\(items\)/)
  assert.match(screen, /setWorkingHours\(formatSalonWorkingHours/)
  assert.doesNotMatch(screen, /catch\(\(\) => setSettings\(null\)\)|catch\(\(\) => setWorkingHours\(''\)\)/)
  assert.match(screen, /settingsRequestGeneration\.current \+= 1[\s\S]*?hoursRequestGeneration\.current \+= 1/)
})
