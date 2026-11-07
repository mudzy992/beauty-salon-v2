import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./ReservationScreen.tsx', import.meta.url), 'utf8')

test('reservation step indicator exposes localized progressbar semantics', () => {
  assert.match(resources, /progressLabel: 'Napredak rezervacije'/)
  assert.match(resources, /step: 'Korak \{\{current\}\} od \{\{total\}\}'/)
  assert.match(
    screen,
    /<View\s+style=\{styles\.steps\}\s+accessible\s+accessibilityRole="progressbar"\s+accessibilityLabel=\{t\('reservation\.progressLabel'\)\}\s+accessibilityValue=\{\{\s*min: 1,\s*max: 4,\s*now: step,\s*text: t\('reservation\.step', \{ current: step, total: 4 \}\),\s*\}\}/,
  )
})
