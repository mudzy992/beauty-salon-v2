import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const screens = [
  readFileSync(new URL('./ServiceWorkGalleryScreen.tsx', import.meta.url), 'utf8'),
  readFileSync(new URL('./SatisfiedClientsScreen.tsx', import.meta.url), 'utf8'),
]

test('gallery network and malformed-response failures are distinct from successful empty pages', () => {
  for (const screen of screens) {
    assert.match(screen, /normalizeBeforeAfterPage\(data\)/)
    assert.match(screen, /if \(!page\) \{\s*setLoadError\(true\)/)
    assert.match(screen, /catch \{\s*if \(generation === requestGeneration\.current\) setLoadError\(true\)/)
    assert.doesNotMatch(screen, /catch \{[^}]*setHasMore\(false\)/s)
    assert.match(screen, /ListEmptyComponent=\{\s*!loadError \?/)
    assert.match(screen, /beforeAfterGallery\.emptyTitle/)
    assert.match(screen, /beforeAfterGallery\.emptyMessage/)
  }
})

test('gallery pagination failures preserve existing images and can retry without auto-looping', () => {
  for (const screen of screens) {
    assert.match(screen, /!loading && !loadingMore && !loadError && hasMore/)
    assert.match(screen, /const retryLoad = useCallback/)
    assert.match(screen, /items\.length === 0 \? 0 : offset, items\.length > 0/)
    assert.match(screen, /beforeAfterGallery\.loadMoreError/)
    assert.match(screen, /onPress=\{retryLoad\}/)
    assert.doesNotMatch(screen, /catch \{[^}]*setItems\(\[\]\)/s)
  }
})

test('gallery user-facing copy and retry controls use shared localized resources', () => {
  for (const screen of screens) {
    assert.match(screen, /beforeAfterGallery\.pageHint/)
    assert.match(screen, /beforeAfterGallery\.loadError/)
    assert.match(screen, /title=\{t\('common\.retry'\)\}/)
    assert.doesNotMatch(screen, /Povucite sliku lijevo|Nema transformacija|Kada budu dostupne/)
  }
})
