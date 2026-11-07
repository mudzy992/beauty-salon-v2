import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./ReservationScreen.tsx', import.meta.url), 'utf8')
const searchInput = screen.match(/<TextInput\s+style=\{\[styles\.searchInput[\s\S]*?\/>/)?.[0]

test('reservation service search has a localized accessible name and hint', () => {
  assert.match(resources, /serviceSearchLabel: 'Pretraga usluga'/)
  assert.match(resources, /serviceSearchHint: 'Unesite naziv ili opis da suzite listu usluga\.'/)
  assert.ok(searchInput, 'Service-search input should exist')
  assert.match(searchInput, /accessibilityLabel=\{t\('reservation\.serviceSearchLabel'\)\}/)
  assert.match(searchInput, /accessibilityHint=\{t\('reservation\.serviceSearchHint'\)\}/)
  assert.match(searchInput, /placeholder=\{t\('common\.search'\)\}/)
})
