import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  WORK_GALLERY_MAX_PHOTO_BYTES,
  WORK_GALLERY_PHOTO_MIMES,
  checkPhoto,
  isValidEligibleEntry,
  isValidEligiblePage,
  isValidPendingPair,
  isValidPendingPage,
} from './work-gallery-upload-types.mjs'
import { API_ERROR_CODE_TO_KEY, resolveApiErrorCodeKey } from '../api-errors/api-error-code-map.mjs'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL(`../../i18n/locales/${language}.json`, import.meta.url), 'utf8')),
)

const hasLocaleKey = (resource, key) => key.split('.').reduce((value, part) => value?.[part], resource) !== undefined

const readSource = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8')

const eligibleEntry = (overrides = {}) => ({
  id: 'entry-1',
  completedAt: '2026-01-01T12:00:00.000Z',
  date: '2026-01-01',
  reference: 'REF-1',
  clientName: 'Amir B.',
  ...overrides,
})

const pendingPair = (overrides = {}) => ({
  ...eligibleEntry(),
  images: [
    { id: 'image-1', role: 'before', private: true, consented: false },
    { id: 'image-2', role: 'after', private: true, consented: false },
  ],
  ...overrides,
})

test('only real photo types and sizes are accepted', () => {
  for (const mime of WORK_GALLERY_PHOTO_MIMES) {
    assert.equal(checkPhoto({ type: mime, size: 1024 }), null, mime)
  }
  assert.equal(checkPhoto({ type: 'image/svg+xml', size: 1024 }), 'type')
  assert.equal(checkPhoto({ type: 'application/pdf', size: 1024 }), 'type')
  assert.equal(checkPhoto({ type: '', size: 1024 }), 'type')
  assert.equal(checkPhoto({ type: 'image/jpeg', size: WORK_GALLERY_MAX_PHOTO_BYTES }), null)
  assert.equal(checkPhoto({ type: 'image/jpeg', size: WORK_GALLERY_MAX_PHOTO_BYTES + 1 }), 'size')
})

test('eligible records are validated before they reach the upload form', () => {
  assert.equal(isValidEligibleEntry(eligibleEntry()), true)
  assert.equal(isValidEligibleEntry(eligibleEntry({ id: '' })), false)
  assert.equal(isValidEligibleEntry(eligibleEntry({ date: '2026-1-1' })), false)
  assert.equal(isValidEligibleEntry(eligibleEntry({ completedAt: 'not-a-date' })), false)
  assert.equal(isValidEligibleEntry(eligibleEntry({ clientName: 42 })), false)
  assert.equal(isValidEligibleEntry(null), false)
})

test('pending pairs are validated and never carry a file path', () => {
  assert.equal(isValidPendingPair(pendingPair()), true)
  assert.equal(isValidPendingPair(pendingPair({ images: [{ id: 'image-1', role: 'before', private: true }] })), false)
  assert.equal(isValidPendingPair(pendingPair({ images: [{ id: 'image-1', role: 'other', private: 'yes', consented: false }] })), false)
  assert.equal(isValidPendingPair(pendingPair({ images: [{ id: 'image-1', role: 'before', private: true, consented: false, pathOriginal: 'private/x.jpg' }] })), true)
  assert.equal(JSON.stringify(pendingPair()).includes('pathOriginal'), false)
})

test('pages are validated before they are shown', () => {
  assert.equal(isValidEligiblePage({ items: [eligibleEntry()], hasMore: false, nextOffset: 1 }), true)
  assert.equal(isValidEligiblePage({ items: [eligibleEntry()], hasMore: 'no', nextOffset: 1 }), false)
  assert.equal(isValidEligiblePage({ items: [eligibleEntry()], hasMore: false, nextOffset: -1 }), false)
  assert.equal(isValidPendingPage({ items: [pendingPair()], hasMore: false, nextOffset: 1 }), true)
  assert.equal(isValidPendingPage({ items: [{ id: 'x' }], hasMore: false, nextOffset: 1 }), false)
})

test('the upload screen uses translated keys that exist in both locales', () => {
  const sources = [
    readSource('./work-gallery-upload.tsx'),
    readSource('./work-gallery-record-picker.tsx'),
    readSource('./work-gallery-photo-fields.tsx'),
    readSource('./work-gallery-pending-pairs.tsx'),
    readSource('./use-work-gallery-upload.ts'),
  ]
  const keys = new Set()
  for (const source of sources) {
    for (const [, key] of source.matchAll(/\bt\('([^']+)'/g)) keys.add(key)
  }
  for (const key of [
    'admin.serviceWorkGallery.pairHeading',
    'admin.serviceWorkGallery.pairHelp',
    'admin.serviceWorkGallery.pairRecordLabel',
    'admin.serviceWorkGallery.pairBeforeLabel',
    'admin.serviceWorkGallery.pairAfterLabel',
    'admin.serviceWorkGallery.pairPhotoTypeInvalid',
    'admin.serviceWorkGallery.pairSubmit',
    'admin.serviceWorkGallery.pairPendingHeading',
  ]) {
    assert.ok(keys.has(key), `missing literal translation call: ${key}`)
  }
  for (const resource of locales) {
    for (const key of keys) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }
})

test('every upload error code resolves to a translated key', () => {
  for (const code of [
    'WORK_GALLERY_SERVICE_NOT_FOUND',
    'WORK_GALLERY_ENTRY_NOT_ELIGIBLE',
    'WORK_GALLERY_PAIR_ALREADY_EXISTS',
    'WORK_GALLERY_PAIR_PHOTOS_REQUIRED',
    'WORK_GALLERY_PAIR_PHOTO_TYPE_INVALID',
  ]) {
    const key = resolveApiErrorCodeKey(code)
    assert.ok(key, `${code} has no translation`)
    for (const resource of locales) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }
  assert.equal(resolveApiErrorCodeKey('WORK_GALLERY_PAIR_ALREADY_EXISTS'), API_ERROR_CODE_TO_KEY.WORK_GALLERY_PAIR_ALREADY_EXISTS)
})

test('the upload flow never renders a raw backend message', () => {
  const hook = readSource('./use-work-gallery-upload.ts')
  assert.ok(hook.includes('resolveAdminApiErrorKey('))
  assert.ok(hook.includes('getErrorCode(err)'))
  assert.equal(hook.includes('getErrorMessage(err, \'\')'), true)
})

test('the upload form labels both photo inputs and limits the accepted types', () => {
  // Polja za fotografije su izdvojena u vlastiti modul; forma ih samo slaže.
  const component = readSource('./work-gallery-photo-fields.tsx')
  const form = readSource('./work-gallery-upload.tsx')
  assert.ok(component.includes('htmlFor={inputId}'))
  assert.ok(component.includes('work-gallery-pair-${side}'))
  assert.ok(form.includes('side="before"'))
  assert.ok(form.includes('side="after"'))
  assert.ok(component.includes('accept={WORK_GALLERY_PHOTO_MIMES.join(\',\')}'))
  assert.ok(component.includes('aria-invalid={rejection ? true : undefined}'))
})
