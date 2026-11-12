import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/public/PublicHome.tsx', import.meta.url), 'utf8')

test('public homepage exposes its configured hero title as the sole level-one heading', () => {
  assert.equal([...source.matchAll(/<h1\b/g)].length, 1)
  assert.match(source, /<h1 className="text-4xl[\s\S]*?\{titleRest \?[\s\S]*?heroTitle[\s\S]*?<\/h1>/)
})

test('homepage highlight and about titles are semantic section headings', () => {
  assert.match(source, /<h2 className="text-lg font-semibold text-slate-900 mb-2">\s*\{item\.title\}\s*<\/h2>/)
  assert.match(source, /<h2 className="text-3xl md:text-4xl font-semibold text-slate-900 mt-2">\s*\{aboutTitle\}\s*<\/h2>/)
  assert.match(source, /<h2 className="text-2xl font-semibold tracking-tight text-slate-950">\s*\{getSetting\('public_cta_title'/)
})

test('decorative homepage highlight icons are hidden from assistive technology', () => {
  assert.match(source, /<Icon className="h-10 w-10 text-brand-gold-text mx-auto mb-4" aria-hidden="true" \/>/)
})

test('homepage navigation CTAs use a single styled anchor control', () => {
  assert.equal([...source.matchAll(/<Button\s+asChild/g)].length, 5)
  assert.match(source, /<Button asChild variant="onDark" size="lg"[^>]*>\s*<Link to="\/rezervacija">/)
  assert.match(source, /<Button asChild variant="onDarkOutline" size="lg"[^>]*>\s*<Link to="\/usluge">/)
  assert.match(source, /<Button asChild variant="outline">\s*<Link to="\/usluge">/)
  assert.match(source, /<Button asChild>\s*<Link to="\/kontakt">/)
  assert.match(source, /<Button asChild size="lg"[^>]*>\s*<Link to="\/rezervacija">/)
  assert.doesNotMatch(source, /<Link to="\/(?:rezervacija|usluge|kontakt)"[^>]*>\s*<Button/)
})

test('editorial home keeps real content, feature gates and classic-compatible scoped hooks', () => {
  const css = readFileSync(new URL('../../styles/globals.css', import.meta.url), 'utf8')
  for (const hook of ['data-home-hero-content', 'data-home-highlights', 'data-home-highlight', 'data-home-about', 'data-home-about-image', 'data-home-transformations', 'data-home-review', 'data-home-cta']) {
    assert.ok(source.includes(hook), `missing ${hook}`)
    assert.ok(css.includes(`[data-skin="aurum"] [${hook}]`) || hook === 'data-home-hero-content', `missing scoped styling for ${hook}`)
  }
  assert.match(source, /reviewsOn && \(featuredReviewLoading \|\| featuredReviewLoadError \|\| featuredReview\)/)
  assert.match(source, /!beforeAfterLoading && beforeAfterPairs\.length === 0 && !beforeAfterLoadError/)
  assert.match(source, /backgroundImage: cssBackgroundImage\(heroImage\)/)
  assert.match(source, /\{aboutText\}/)
})

test('editorial discovery links respect public feature settings and do not fabricate entries', () => {
  assert.match(source, /isPublicFeatureOn\(getSetting, 'public_feature_gallery'\)/)
  assert.match(source, /isPublicFeatureOn\(getSetting, 'public_feature_blog'\)/)
  assert.match(source, /galleryOn && <article>[\s\S]*?<Link to="\/galerija">/)
  assert.match(source, /blogOn && <article>[\s\S]*?<Link to="\/blog">/)
  assert.match(source, /data-home-image-fallback=\{!heroImage\.trim\(\)/)
})

test('campaign hero gives copy a solid token background and uses configured image before fallback', () => {
  const css = readFileSync(new URL('../../styles/globals.css', import.meta.url), 'utf8')
  assert.match(source, /data-home-image-fallback=\{!heroImage\.trim\(\) \? 'true' : undefined\}/)
  assert.match(source, /backgroundImage: cssBackgroundImage\(heroImage\)/)
  assert.match(css, /\[data-home-hero-content\] \{[^}]*background: var\(--nejra-hero-page\);[^}]*color: var\(--nejra-hero-text\);/)
  assert.match(css, /\[data-home-image-fallback="true"\] \{ background-image: url\('\/brand\/aurum-hero-editorial\.jpg'\)/)
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*?\[data-aurum-hero-image\], \.theme-switcher-icon \{ animation: none;/)
})
