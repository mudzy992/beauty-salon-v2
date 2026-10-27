import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)
const source = readFileSync(new URL('../../pages/Reviews.tsx', import.meta.url), 'utf8')
const translationKeys = [...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key)
const leafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? leafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )
const getPath = (resource, key) => key.split('.').reduce((value, part) => value?.[part], resource)

test('review page translation references exist in both locale resources', () => {
  for (const locale of locales) {
    for (const key of translationKeys) {
      assert.notEqual(getPath(locale, key), undefined, `Missing locale key: ${key}`)
    }
  }
  assert.deepEqual(
    leafPaths(locales[0].reviews, 'reviews').sort(),
    leafPaths(locales[1].reviews, 'reviews').sort(),
  )
  assert.match(source, /formatLocalizedDateTime\(detail\.createdAt, i18n\.language\)/)
  assert.match(source, /new Intl\.DateTimeFormat\(getIntlLocale\(i18n\.language\), \{ dateStyle: 'medium' \}\)/)
  assert.match(source, /formatLocalizedNumber\(detail\.serviceRating, i18n\.language\)/)
  assert.match(source, /formatLocalizedNumber\(detail\.stylistRating, i18n\.language\)/)
})

test('review filtering and moderation API contracts remain unchanged', () => {
  assert.match(source, /if \(filter === 'approved'\) params\.approved = 'true'/)
  assert.match(source, /else if \(filter === 'pending'\) params\.approved = 'false'/)
  assert.match(source, /\.get<Review\[]>\('\/api\/reviews\/admin', \{ params \}\)/)
  assert.match(source, /\.patch\(`\/api\/reviews\/\$\{id\}\/approve`\)/)
  assert.match(source, /\.delete\(`\/api\/reviews\/\$\{id\}`\)/)
  assert.match(source, /if \(isApproved === true\)/)
  assert.match(source, /if \(isApproved === false\)/)
  assert.match(source, /return <Badge variant="warning">\{t\('reviews\.pending'\)\}<\/Badge>/)
})

test('reviewer, service and submitted comment values remain dynamic', () => {
  assert.match(source, /getUserName\(r\.user\)/)
  assert.match(source, /r\.service\?\.name \?\? '-'/)
  assert.match(source, /getUserName\(r\.stylist\?\.user\)/)
  assert.match(source, /\{r\.comment \?\? '-'\}/)
  assert.match(source, /\{detail\.comment\}/)
  assert.doesNotMatch(source, /Recenzija odobrena|Recenzija obrisana|Obrisati recenziju\?|Odobreno<\/Badge>|Odbijeno<\/Badge>/)
})
