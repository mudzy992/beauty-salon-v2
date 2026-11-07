import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./ServicesScreen.tsx', import.meta.url), 'utf8')
const categoryCard = screen.match(/<Card\s+key=\{item\.id\}([\s\S]*?)<\/Card>/)?.[1]

test('service category cards expose localized button names and destination hints', () => {
  assert.match(resources, /categoryCardAccessibilityLabel: 'Kategorija: \{\{category\}\}'/)
  assert.match(resources, /categoryCardHint: 'Otvara usluge u kategoriji \{\{category\}\}\.'/)
  assert.ok(categoryCard, 'Category card should exist')
  assert.match(categoryCard, /accessibilityRole="button"/)
  assert.match(categoryCard, /accessibilityLabel=\{t\('services\.categoryCardAccessibilityLabel', \{ category: item\.name \}\)\}/)
  assert.match(categoryCard, /accessibilityHint=\{t\('services\.categoryCardHint', \{ category: item\.name \}\)\}/)
  assert.match(categoryCard, /onPress=\{\(\) => openCategory\(item\)\}/)
  assert.match(screen, /navigation\.navigate\('ServiceDetail', \{\s*categoryId: category\.id,\s*categoryName: category\.name/)
})
