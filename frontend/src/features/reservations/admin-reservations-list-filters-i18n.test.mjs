import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL(`../../i18n/locales/${language}.json`, import.meta.url), 'utf8')),
)
const filterSource = readFileSync(new URL('./components/reservation-filters.tsx', import.meta.url), 'utf8')
const pageSource = readFileSync(new URL('../../pages/Reservations.tsx', import.meta.url), 'utf8')
const statusSource = readFileSync(new URL('./status.ts', import.meta.url), 'utf8')
const filterKeys = [
  'fromDate',
  'toDate',
  'status',
  'clientName',
  'clientSearchPlaceholder',
  'clientSearchLabel',
  'reset',
]
const hasLocaleKey = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource) !== undefined

test('admin reservation-list filter copy has Bosnian and English translations', () => {
  for (const key of filterKeys) {
    const translationKey = `reservations.listFilters.${key}`
    assert.ok(filterSource.includes(`t('${translationKey}')`), `Filter does not use ${translationKey}`)
    for (const resource of locales) {
      assert.ok(hasLocaleKey(resource, translationKey), `Missing locale key: ${translationKey}`)
      assert.ok(hasLocaleKey(resource, translationKey) && resource.reservations.listFilters[key], `Empty locale value: ${translationKey}`)
    }
  }

  assert.ok(pageSource.includes("t('reservations.listFilters.allStatuses')"))
  for (const resource of locales) {
    assert.ok(hasLocaleKey(resource, 'reservations.listFilters.allStatuses'))
  }
})

test('admin reservation status options use localized labels without changing their values', () => {
  const options = [...statusSource.matchAll(/\{ value: '([^']*)', label: '([^']*)' \}/g)]
    .map(([, value]) => value)

  assert.ok(options.length > 0, 'No reservation status options found')
  assert.match(pageSource, /statusOptions=\{RESERVATION_STATUS_OPTIONS\.map\(\(option\) => \(\{/)
  assert.match(pageSource, /\.\.\.option,/)
  assert.match(pageSource, /t\(`reservations\.statuses\.\$\{option\.value\}`/)
  assert.match(pageSource, /t\('reservations\.listFilters\.allStatuses'\)/)

  for (const status of options.filter(Boolean)) {
    for (const resource of locales) {
      assert.ok(
        hasLocaleKey(resource, `reservations.statuses.${status}`),
        `Missing status translation: reservations.statuses.${status}`,
      )
    }
  }
})
