import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./HomeScreen.tsx', import.meta.url), 'utf8')

test('home service-category see-all action has a contextual accessible name and hint', () => {
  assert.match(resources, /viewAllServicesCategoryLabel: 'Sve usluge u kategoriji \{\{category\}\}'/)
  assert.match(resources, /viewAllServicesCategoryHint: 'Otvara listu usluga u kategoriji \{\{category\}\}\.'/)
  assert.ok(screen.includes("accessibilityRole=\"button\"\n                accessibilityLabel={t('home.viewAllServicesCategoryLabel', { category: category.name })}\n                accessibilityHint={t('home.viewAllServicesCategoryHint', { category: category.name })}"))
  assert.match(screen, /navigate\('ServicesTab', \{\s*screen: 'ServiceDetail'/)
})

test('home blog see-all action has a localized name and navigation hint', () => {
  assert.match(resources, /viewAllBlogPostsLabel: 'Sve objave na blogu'/)
  assert.match(resources, /viewAllBlogPostsHint: 'Otvara listu svih objava na blogu\.'/)
  assert.ok(screen.includes("accessibilityLabel={t('home.viewAllBlogPostsLabel')}"))
  assert.ok(screen.includes("accessibilityHint={t('home.viewAllBlogPostsHint')}"))
  assert.match(screen, /onPress=\{\(\) => navigation\.navigate\('BlogList'\)\}/)
})
