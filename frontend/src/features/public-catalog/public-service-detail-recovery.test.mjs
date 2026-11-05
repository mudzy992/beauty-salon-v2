import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/public/PublicServiceDetail.tsx', import.meta.url), 'utf8')

test('public service and gallery reads validate route identity and response shape', () => {
  assert.match(source, /const isServiceResponse = \(value: unknown, expectedId: string\)/)
  assert.match(source, /if \(!isServiceResponse\(data, id\)\)/)
  assert.match(source, /const isBeforeAfterPair = \(value: unknown\)/)
  assert.match(source, /!data\.items\.every\(isBeforeAfterPair\)/)
  assert.match(source, /Number\.isSafeInteger\(data\.nextOffset\)/)
})

test('service and gallery loading are announced and empty/error states stay distinct', () => {
  assert.equal((source.match(/role="status" aria-live="polite"/g) ?? []).length, 3)
  assert.match(source, /role="alert"[\s\S]*?serviceDetail\.loadFailed[\s\S]*?serviceDetail\.retry/)
  assert.match(source, /role="alert"[\s\S]*?serviceDetail\.galleryLoadFailed[\s\S]*?serviceDetail\.retry/)
  assert.match(source, /role="status" className="text-slate-600 text-center[\s\S]*?serviceDetail\.noGalleryItems/)
  assert.match(source, /Info className="h-6 w-6 text-slate-600" aria-hidden="true"/)
})

test('route changes and overlapping service/gallery requests cannot apply stale results', () => {
  assert.match(source, /const requestId = \+\+serviceRequestIdRef\.current/)
  assert.equal((source.match(/requestId === serviceRequestIdRef\.current/g) ?? []).length, 3)
  assert.match(source, /const requestId = \+\+galleryRequestIdRef\.current/)
  assert.equal((source.match(/requestId === galleryRequestIdRef\.current/g) ?? []).length, 3)
  assert.match(source, /serviceRequestIdRef\.current \+= 1/)
  assert.match(source, /galleryRequestIdRef\.current \+= 1/)
})
