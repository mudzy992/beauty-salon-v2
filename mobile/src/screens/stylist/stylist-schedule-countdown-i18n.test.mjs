import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./StylistScheduleScreen.tsx', import.meta.url), 'utf8')

test('stylist active reservation countdown uses translated labels', () => {
  assert.match(resource, /countdownRemaining:\s*'Do kraja: \{\{time\}\}'/)
  assert.match(resource, /countdownOverrun:\s*'Prekoračenje: \{\{sign\}\}\{\{time\}\}'/)
  assert.match(screen, /t\('stylist\.schedule\.countdownRemaining', \{ time: core \}\)/)
  assert.match(screen, /t\('stylist\.schedule\.countdownOverrun', \{ sign, time: core \}\)/)
  assert.doesNotMatch(screen, /`Do kraja: \$\{core\}`|`Prekoračenje: \$\{sign\}\$\{core\}`/)
})

test('active countdown timing and remaining-versus-overrun conditions remain unchanged', () => {
  assert.match(screen, /end\.getTime\(\) - Date\.now\(\)/)
  assert.match(screen, /const sign = diffMs >= 0 \? '' : '\+'/)
  assert.match(screen, /Math\.abs\(diffMs\)/)
  assert.match(screen, /Math\.floor\(abs \/ 1000\)/)
  assert.match(screen, /return diffMs >= 0\s*\?\s*t\('stylist\.schedule\.countdownRemaining'/)
  assert.match(screen, /:\s*t\('stylist\.schedule\.countdownOverrun'/)
  assert.match(screen, /\}, \[activeReservation, t, tick\]\)/)
})
