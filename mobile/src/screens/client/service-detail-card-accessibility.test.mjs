import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./ServiceDetailScreen.tsx', import.meta.url), 'utf8')
const serviceInfo = screen.match(/<TouchableOpacity\s+style=\{styles\.serviceInfo\}([\s\S]*?)<\/TouchableOpacity>/)?.[1]
const bookButton = screen.match(/<Button\s+title=\{t\('services\.bookService'\)\}([\s\S]*?)\/>/)?.[1]

test('service details and booking actions expose localized context and hints', () => {
  assert.match(resources, /serviceDetailsAccessibilityLabel: 'Detalji: \{\{service\}\}, \{\{duration\}\} min\.'/)
  assert.match(resources, /serviceDetailsHint: 'Otvara detalje usluge\.'/)
  assert.match(resources, /bookServiceAccessibilityLabel: 'Rezerviši uslugu \{\{service\}\}'/)
  assert.match(resources, /bookServiceHint: 'Otvara izbor termina za ovu uslugu\.'/)

  assert.ok(serviceInfo, 'Service details action should exist')
  assert.match(serviceInfo, /accessibilityRole="button"/)
  assert.match(serviceInfo, /t\('services\.serviceDetailsAccessibilityLabel'/)
  assert.match(serviceInfo, /t\('services\.serviceDetailsHint'\)/)

  assert.ok(bookButton, 'Booking action should exist')
  assert.match(bookButton, /accessibilityLabel=\{t\('services\.bookServiceAccessibilityLabel'/)
  assert.match(bookButton, /accessibilityHint=\{t\('services\.bookServiceHint'\)\}/)
})
