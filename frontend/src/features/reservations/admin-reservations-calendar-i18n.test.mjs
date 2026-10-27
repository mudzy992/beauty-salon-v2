import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)
const source = readFileSync(new URL('../../pages/ReservationsCalendar.tsx', import.meta.url), 'utf8')
const scheduler = readFileSync(new URL('./components/ReservationScheduler.tsx', import.meta.url), 'utf8')
const pageKeys = [...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key)
const hasLocaleKey = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource) !== undefined

test('reservation calendar page copy has matching Bosnian and English translations', () => {
  for (const resource of locales) {
    for (const key of pageKeys) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }

  for (const key of [
    'reservations.calendar.title',
    'reservations.calendar.workspace',
    'reservations.calendar.back',
    'reservations.calendar.created',
    'reservations.calendar.createError',
    'reservations.calendar.moved',
    'reservations.calendar.returnedFromDailyLog',
    'reservations.calendar.moveError',
    'reservations.calendar.cancelled',
    'reservations.calendar.cancelError',
  ]) {
    assert.ok(pageKeys.includes(key), `Calendar page does not use ${key}`)
  }
})

test('calendar toolbar and filters have matching Bosnian and English translations', () => {
const toolbarKeys = [...scheduler.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key)
  const expectedKeys = [
    'reservations.calendar.toolbar.title',
    'reservations.calendar.toolbar.selectedStylistsCount',
    'reservations.calendar.toolbar.allStylists',
    'reservations.calendar.toolbar.newAppointment',
    'reservations.calendar.toolbar.previous',
    'reservations.calendar.toolbar.next',
    'reservations.calendar.toolbar.stylists',
    'reservations.calendar.toolbar.all',
    'reservations.calendar.toolbar.unassigned',
    'reservations.calendar.toolbar.dailyLog',
  ]

  for (const key of expectedKeys) {
    assert.ok(toolbarKeys.includes(key), `Calendar toolbar does not use ${key}`)
    for (const resource of locales) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }

  assert.match(scheduler, /props\.onViewChange\('dayGridMonth'\)/)
  assert.match(scheduler, /props\.onSelectedStylistIdsChange\(\[\]\)/)
})

test('calendar localization preserves reservation endpoints, requests and navigation', () => {
  assert.match(source, /api\.post\('\/api\/reservations\/admin', payload\)/)
  assert.match(source, /api\.patch\(`\/api\/reservations\/\$\{payload\.reservationId\}`/)
  assert.match(source, /api\.post\(`\/api\/reservations\/\$\{payload\.reservationId\}\/admin-cancel`/)
  assert.match(source, /navigate\('\/admin\/reservations'\)/)
  assert.match(source, /<ReservationScheduler\s/)
})
