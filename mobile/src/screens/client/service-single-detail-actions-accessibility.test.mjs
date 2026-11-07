import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./ServiceSingleDetailScreen.tsx', import.meta.url), 'utf8')
const galleryButton = screen.match(/<Button\s+title=\{t\('services\.viewAllBeforeAfter'\)\}([\s\S]*?)\/>/)?.[1]
const bookingButton = screen.match(/<Button\s+title=\{t\('services\.bookService'\)\}([\s\S]*?)\/>/)?.[1]

test('gallery and booking actions expose localized service context and destination hints', () => {
  assert.match(resources, /viewAllBeforeAfterAccessibilityLabel: 'Pogledaj sve fotografije prije i poslije za uslugu \{\{service\}\}'/)
  assert.match(resources, /viewAllBeforeAfterHint: 'Otvara galeriju radova ove usluge\.'/)

  assert.ok(galleryButton, 'View-all gallery action should exist')
  assert.match(galleryButton, /accessibilityLabel=\{t\('services\.viewAllBeforeAfterAccessibilityLabel'/)
  assert.match(galleryButton, /accessibilityHint=\{t\('services\.viewAllBeforeAfterHint'\)\}/)
  assert.match(galleryButton, /navigate\('ServiceWorkGallery'/)

  assert.ok(bookingButton, 'Booking action should exist')
  assert.match(bookingButton, /accessibilityLabel=\{t\('services\.bookServiceAccessibilityLabel'/)
  assert.match(bookingButton, /accessibilityHint=\{t\('services\.bookServiceHint'\)\}/)
  assert.match(bookingButton, /navigate\('Reservation'/)
})
