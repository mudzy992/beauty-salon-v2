import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./ReservationScreen.tsx', import.meta.url), 'utf8')
const searchInput = screen.match(/<TextInput\s+style=\{\[styles\.searchInput[\s\S]*?\/>/)?.[0]
const searchEmptyState = screen.match(/ListEmptyComponent=\{([\s\S]*?)\n            \}\n            renderItem=/)?.[1]

test('reservation service search has a localized accessible name, hint, and no-result state', () => {
  assert.match(resources, /serviceSearchLabel: 'Pretraga usluga'/)
  assert.match(resources, /serviceSearchHint: 'Unesite naziv ili opis da suzite listu usluga\.'/)
  assert.ok(searchInput, 'Service-search input should exist')
  assert.match(searchInput, /accessibilityLabel=\{t\('reservation\.serviceSearchLabel'\)\}/)
  assert.match(searchInput, /accessibilityHint=\{t\('reservation\.serviceSearchHint'\)\}/)
  assert.match(searchInput, /placeholder=\{t\('common\.search'\)\}/)
  assert.match(resources, /noServiceSearchResults: 'Nema usluga koje odgovaraju pretrazi\.'/)
  assert.ok(searchEmptyState, 'Service-search empty state should exist')
  assert.match(searchEmptyState, /!serviceCatalog\.loading && !serviceCatalog\.error && services\.length > 0/)
  assert.match(searchEmptyState, /searchQuery\.trim\(\)\s*\? t\('reservation\.noServiceSearchResults'\)/)
  assert.match(searchEmptyState, /: t\('services\.noServices'\)/)
})
