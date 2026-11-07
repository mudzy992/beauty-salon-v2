import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const resources = read('../i18n/bs.ts')
const profileData = read('../screens/client/profile-data.ts')
const profile = read('../screens/client/ProfileScreen.tsx')
const dailyLog = read('../screens/stylist/DailyLogDetailScreen.tsx')

const accessibleImages = (source) => [...source.matchAll(/<MediaImage\b[\s\S]*?\/>/g)].map(([tag]) => tag)

test('media-consent descriptions survive parsing and name pending and active photos', () => {
  assert.match(profileData, /description: typeof value\.description === 'string' \? value\.description\.trim\(\) : ''/)
  assert.match(profileData, /value\.description !== undefined && value\.description !== null && typeof value\.description !== 'string'/)
  assert.equal((profile.match(/const imageAccessibilityLabel = item\.description \|\| label;/g) ?? []).length, 2)
  assert.match(profile, /const label = item\.isBefore \? t\('profile\.mediaConsent\.beforeTreatment'\) : t\('profile\.mediaConsent\.afterTreatment'\)/)

  const images = accessibleImages(profile)
  assert.equal(images.length, 2, 'Expected separate pending and active media-consent images')
  for (const image of images) {
    assert.match(image, /accessible\s+accessibilityLabel=\{imageAccessibilityLabel\}/)
  }
  assert.equal((profile.match(/const imageAccessibilityLabel = item\.description \|\| label;/g) ?? []).length, 2)
})

test('daily-log before/after thumbnails use authored descriptions with localized contextual fallbacks', () => {
  assert.ok(resources.includes("beforePhotoAccessibilityLabel: 'Fotografija prije tretmana'"))
  assert.ok(resources.includes("afterPhotoAccessibilityLabel: 'Fotografija nakon tretmana'"))
  const images = accessibleImages(dailyLog)
  assert.equal(images.length, 2, 'Expected before and after image groups')
  assert.match(images[0], /accessible\s+accessibilityLabel=\{\s*img\.description\?\.trim\(\)\s*\|\|\s*t\('stylist\.dailyLogDetail\.beforePhotoAccessibilityLabel'\)\s*\}/)
  assert.match(images[1], /accessible\s+accessibilityLabel=\{\s*img\.description\?\.trim\(\)\s*\|\|\s*t\('stylist\.dailyLogDetail\.afterPhotoAccessibilityLabel'\)\s*\}/)
})
