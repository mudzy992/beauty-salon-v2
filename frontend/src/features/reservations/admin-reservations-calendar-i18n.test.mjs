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

test('react-big-calendar labels use matching BS/EN translation resources', () => {
  const calendarMessages = scheduler.match(
    /const messages = useMemo\(([\s\S]*?)\n  const openCreate/,
  )?.[1]
  assert.ok(calendarMessages, 'Calendar messages should remain memoized')

  const keys = [
    'today', 'previous', 'next', 'month', 'week', 'day', 'agenda', 'date', 'time', 'event',
    'allDay', 'workWeek', 'yesterday', 'tomorrow', 'showMore', 'noEventsInRange',
  ].map((key) => `reservations.calendar.messages.${key}`)
  for (const key of keys) {
    assert.ok(calendarMessages.includes(key), `Calendar messages do not use ${key}`)
    for (const resource of locales) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }

  assert.match(calendarMessages, /\[t\]/)
  assert.doesNotMatch(calendarMessages, /localeKey\.startsWith/)
})

test('reservation detail drawer copy has matching Bosnian and English translations', () => {
  const detailKeys = [...scheduler.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key)
    .filter((key) => key.startsWith('reservations.calendar.details.'))
  const expectedKeys = [
    'status', 'appointment', 'total', 'client', 'stylist', 'unconfirmed', 'clientNotes',
    'cancelReason', 'editAppointment', 'dailyLogMoveHelp', 'editHelp', 'date', 'startTime',
    'endTime', 'saveError', 'saving', 'saveChanges', 'dailyLogTitle', 'dailyLogHelp',
    'openDailyLog', 'confirmAttendanceTitle', 'confirmAttendanceHelp', 'attendanceConfirmed',
    'attendanceConfirmError', 'confirmingAttendance', 'confirmAttendance', 'cancelTitle',
    'cancelHelp', 'cancelReasonPlaceholder', 'close', 'cancelError', 'cancelling', 'cancelAction',
  ].map((key) => `reservations.calendar.details.${key}`)

  for (const key of expectedKeys) {
    assert.ok(detailKeys.includes(key), `Reservation detail drawer does not use ${key}`)
    for (const resource of locales) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }

  assert.match(scheduler, /t\(reservationStatusTranslationKey\(activeReservation\.status/)
  assert.match(scheduler, /CANCELLED_UNCONFIRMED_ATTENDANCE/)
  for (const resource of locales) {
    for (const status of ['CONFIRMED', 'PENDING', 'CANCELLED_BY_CLIENT', 'COMPLETED', 'CANCELLED_UNCONFIRMED_ATTENDANCE']) {
      assert.ok(hasLocaleKey(resource, `reservations.statuses.${status}`), `Missing reservation status translation: ${status}`)
    }
  }
})

test('reservation creation drawer copy has matching Bosnian and English translations', () => {
  const createKeys = [...scheduler.matchAll(/\bt\('([^']+)'/g)]
    .map(([, key]) => key)
    .filter((key) => key.startsWith('reservations.calendar.create.'))
  const expectedKeys = [
    'selectClientFirst', 'title', 'subtitle', 'bookingMode', 'standardTitle',
    'standardDescription', 'directTitle', 'directDescription', 'stylist', 'client',
    'clientSearchPlaceholder', 'loadingClients', 'selectedClient', 'service',
    'serviceGenderHint', 'selectClientPlaceholder', 'serviceSearchPlaceholder',
    'removeService', 'clientNote', 'submit',
  ].map((key) => `reservations.calendar.create.${key}`)

  for (const key of expectedKeys) {
    assert.ok(createKeys.includes(key), `Reservation creation drawer does not use ${key}`)
    for (const resource of locales) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }

  assert.match(scheduler, /bookingMode: 'STANDARD'/)
  assert.match(scheduler, /bookingMode: 'STAFF_ADMIN_DIRECT'/)
  assert.match(scheduler, /serviceIds: createDraft\.serviceIds\.map/)
  assert.match(scheduler, /!createDraft\.clientId\.trim\(\)/)
})

test('calendar event fallback labels have matching translations', () => {
  const expectedKeys = ['service', 'client', 'stylist', 'dailyLogPrefix'].map(
    (key) => `reservations.calendar.eventFallbacks.${key}`,
  )

  for (const key of expectedKeys) {
    assert.ok(scheduler.includes(key), `Scheduler does not use ${key}`)
    for (const resource of locales) {
      assert.ok(hasLocaleKey(resource, key), `Missing locale key: ${key}`)
    }
  }

  assert.match(scheduler, /const serviceTitle = reservationServiceTitle\(/)
  assert.match(scheduler, /t\('reservations\.calendar\.eventFallbacks\.dailyLogPrefix'\)/)
})

test('calendar localization preserves reservation endpoints, requests and navigation', () => {
  assert.match(source, /api\.post\('\/api\/reservations\/admin', payload\)/)
  assert.match(source, /api\.patch\(`\/api\/reservations\/\$\{payload\.reservationId\}`/)
  assert.match(source, /api\.post\(`\/api\/reservations\/\$\{payload\.reservationId\}\/admin-cancel`/)
  assert.match(source, /navigate\('\/admin\/reservations'\)/)
  assert.match(source, /<ReservationScheduler\s/)
})
