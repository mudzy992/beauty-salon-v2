import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./ServiceWorkGalleryScreen.tsx', import.meta.url), 'utf8')
const footerStart = screen.indexOf('ListFooterComponent={')
const footerEnd = screen.indexOf('\n        }\n      />', footerStart)
const footer = footerStart >= 0 && footerEnd > footerStart
  ? screen.slice(footerStart, footerEnd)
  : ''

test('service work gallery exposes an explicit accessible pagination action', () => {
  assert.match(resources, /loadMore: 'Učitaj još transformacija'/)
  assert.match(resources, /loadMoreHint: 'Učitava dodatne fotografije prije i poslije\.'/)
  assert.ok(footer, 'Gallery list footer should exist')
  assert.match(footer, /hasMore && items\.length > 0 && !loadError/)
  assert.match(footer, /loadingMore \?\s*\(/)
  assert.match(footer, /<Button/)
  assert.match(footer, /title=\{t\('beforeAfterGallery\.loadMore'\)\}/)
  assert.match(footer, /accessibilityHint=\{t\('beforeAfterGallery\.loadMoreHint'\)\}/)
  assert.match(footer, /onPress=\{onEndReached\}/)
  assert.match(screen, /!loading && !loadingMore && !loadError && hasMore && items\.length > 0/)
})
