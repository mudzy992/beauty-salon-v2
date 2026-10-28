import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import i18next from 'i18next'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)
const source = readFileSync(new URL('../../pages/Gallery.tsx', import.meta.url), 'utf8')
const translationKeys = new Set([...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key))
const leafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? leafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )

test('admin gallery translation references exist with matching BS/EN keys', () => {
  const [bosnian, english] = locales.map((resource) => leafPaths(resource.gallery.admin, 'gallery.admin').sort())
  for (const key of translationKeys) {
    if (key.startsWith('gallery.admin.')) {
      const hasKeyOrPluralForms = (keys) => keys.includes(key) || keys.some((candidate) => candidate.startsWith(`${key}_`))
      assert.ok(hasKeyOrPluralForms(bosnian), `Missing Bosnian key: ${key}`)
      assert.ok(hasKeyOrPluralForms(english), `Missing English key: ${key}`)
    }
  }
  assert.deepEqual(bosnian, english)
  assert.doesNotMatch(source, /toLocaleDateString\(['"]bs-BA['"]\)/)
  assert.match(source, /formatDateOnlyLocale\(image\.serviceDate\.slice\(0, 10\), getIntlLocale\(i18n\.language\)/)
})

test('gallery image counts use correct Bosnian and English plural forms', async () => {
  const instance = i18next.createInstance()
  await instance.init({
    lng: 'bs',
    fallbackLng: false,
    resources: {
      bs: { translation: locales[0] },
      en: { translation: locales[1] },
    },
    interpolation: { escapeValue: false },
  })

  assert.equal(instance.t('gallery.admin.imageCount', { count: 1 }), '1 slika')
  assert.equal(instance.t('gallery.admin.imageCount', { count: 2 }), '2 slike')
  assert.equal(instance.t('gallery.admin.imageCount', { count: 5 }), '5 slika')
  await instance.changeLanguage('en')
  assert.equal(instance.t('gallery.admin.imageCount', { count: 1 }), '1 image')
  assert.equal(instance.t('gallery.admin.imageCount', { count: 2 }), '2 images')
})

test('gallery consent and non-client upload safety gates remain intact', () => {
  assert.match(source, /checked=\{nonClientConfirmed\}/)
  assert.match(source, /disabled=\{!manualFile \|\| !nonClientConfirmed \|\| addingImage\}/)
  assert.match(source, /if \(!manualFile \|\| !selectedCatId \|\| !nonClientConfirmed\) return/)
  assert.match(source, /formData\.append\('nonClientAssetConfirmed', 'true'\)/)
  assert.match(source, /api\.get<EligibleGalleryImage\[]>\(\s*'\/api\/gallery\/eligible-consented-images'/)
  assert.match(source, /api\.post\('\/api\/gallery\/images', \{\s*categoryId: selectedCatId,\s*uploadId: selected\.uploadId,\s*\}\)/)
})

test('gallery category, image and upload API contracts and dynamic data remain unchanged', () => {
  assert.match(source, /\.get<GalleryCategory\[]>\(\s*'\/api\/gallery\/categories'\)/)
  assert.match(source, /api\.get<GalleryCategory>\(`\/api\/gallery\/categories\/\$\{catId\}`\)/)
  assert.match(source, /api\.patch\(`\/api\/gallery\/categories\/\$\{editCatId\}`/)
  assert.match(source, /api\.post\('\/api\/gallery\/categories', catForm\)/)
  assert.match(source, /api\.patch\(`\/api\/gallery\/images\/\$\{editImgId\}`, imgForm\)/)
  assert.match(source, /api\.delete\(`\/api\/gallery\/categories\/\$\{id\}`\)/)
  assert.match(source, /api\.delete\(`\/api\/gallery\/images\/\$\{id\}`\)/)
  assert.match(source, /`\/api\/gallery\/categories\/\$\{selectedCatId\}\/images\/upload`/)
  assert.match(source, /t\('gallery\.admin\.duplicateAutoCategory', \{\s*name: activeAutoCategory\.name/)
  assert.match(source, /\{c\.name\}/)
  assert.match(source, /\{image\.serviceName\}/)
  assert.match(source, /\{img\.title \?\? t\('gallery\.admin\.untitled'\)\}/)
})
