import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/public/PublicServiceDetail.tsx', import.meta.url), 'utf8')

test('public service and gallery reads validate route identity and response shape', () => {
  assert.match(source, /const isServiceResponse = \(/)
  assert.match(source, /if \(!isServiceResponse\(data, id\)\)/)
  assert.match(source, /const isBeforeAfterPair =/)
  assert.match(source, /data\.items\.every\(isBeforeAfterPair\)/)
  assert.match(source, /Number\.isSafeInteger\(data\.nextOffset\)/)
})

test('service and gallery loading are announced and empty/error states stay distinct', () => {
  assert.equal((source.match(/aria-live="polite"/g) ?? []).length, 3)
  assert.match(source, /role="alert"[\s\S]*?serviceDetail\.loadFailed[\s\S]*?serviceDetail\.retry/)
  assert.match(source, /role="alert"[\s\S]*?serviceDetail\.galleryLoadFailed[\s\S]*?serviceDetail\.retry/)
  assert.match(source, /role="status"[\s\S]*?serviceDetail\.noGalleryItems/)
  assert.match(source, /Sparkles className="h-6 w-6" aria-hidden="true"/)
})

test('route changes and overlapping service/gallery requests cannot apply stale results', () => {
  assert.match(source, /const requestId = \+\+serviceRequestIdRef\.current/)
  assert.equal((source.match(/requestId === serviceRequestIdRef\.current/g) ?? []).length, 3)
  assert.match(source, /const requestId = \+\+galleryRequestIdRef\.current/)
  assert.equal((source.match(/requestId === galleryRequestIdRef\.current/g) ?? []).length, 3)
  assert.match(source, /serviceRequestIdRef\.current \+= 1/)
  assert.match(source, /galleryRequestIdRef\.current \+= 1/)
})

test('service detail exposes catalog price, duration, category and configured salon contacts', () => {
  assert.match(source, /price: number \| string/)
  assert.match(source, /service\.durationMinutes/)
  assert.match(source, /service\.subcategory\?\.category\?\.name/)
  assert.match(source, /public_contact_phone/)
  assert.match(source, /public_contact_email/)
  assert.match(source, /public_contact_address/)
  assert.match(source, /public_site_base_url/)
  assert.match(source, /\/rezervacija\?serviceId=/)
  assert.doesNotMatch(source, /Beauty Salon Nejra|site\.siteName|descriptionFallback|MEDIA_FALLBACK_SRC/)
})

test('redesigned detail page retains admin-owned service imagery and locale-safe price formatting', () => {
  assert.match(source, /service\.heroImage/)
  assert.match(source, /public_services_bg/)
  assert.match(source, /getIntlLocale\(i18n\.resolvedLanguage \|\| i18n\.language\)/)
  assert.match(source, /public\.serviceDetail\.galleryEyebrow/)
})

test('service detail links use a single interactive anchor and the unavailable page has a heading', () => {
  assert.match(source, /<Button\s+asChild[\s\S]*?<Link\s+to=\{`\/rezervacija\?serviceId=/)
  assert.match(source, /<Button asChild variant="outline">\s*<Link to="\/usluge">/)
  assert.doesNotMatch(source, /<Link\s+to="\/usluge">\s*<Button/)
  assert.doesNotMatch(source, /<Link\s+to=\{`\/rezervacija\?serviceId=\$\{encodeURIComponent\(service\.id\)\}`\}\s*>\s*<Button/)
  assert.match(source, /<h1 className="text-2xl font-semibold text-slate-900 mb-2">\s*\{t\("public\.serviceDetail\.notFound"\)\}\s*<\/h1>/)
})


test('detail image has no duplicate overlay and no outer white spacer', () => {
  assert.doesNotMatch(source, /data-detail-image-caption/)
  assert.doesNotMatch(source, /className="bg-white min-h-screen pb-20"/)
  assert.match(source, /alt=\{heroImageAlt\}/)
})
