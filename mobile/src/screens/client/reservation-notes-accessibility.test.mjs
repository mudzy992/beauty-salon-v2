import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./ReservationScreen.tsx', import.meta.url), 'utf8')
const notesInput = screen.match(/<TextInput\s+style=\{\[[\s\S]*?styles\.notesInput[\s\S]*?\n          \/>/)?.[0]

test('reservation notes field exposes its localized label and purpose', () => {
  assert.match(resources, /addNotes: 'Napomena \(opciono\)'/)
  assert.match(resources, /notesAccessibilityHint: 'Unesite dodatnu informaciju za frizera koja će biti dodana uz rezervaciju\.'/)
  assert.ok(notesInput, 'Reservation notes input should exist')
  assert.match(notesInput, /accessibilityLabel=\{t\('reservation\.addNotes'\)\}/)
  assert.match(notesInput, /accessibilityHint=\{t\('reservation\.notesAccessibilityHint'\)\}/)
  assert.match(notesInput, /multiline/)
})
