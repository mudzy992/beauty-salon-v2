import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL(`../../i18n/locales/${language}.json`, import.meta.url), 'utf8')),
)
const pageSource = readFileSync(new URL('../../pages/Reservations.tsx', import.meta.url), 'utf8')
const schemaSource = readFileSync(new URL('../../../../backend/prisma/schema.prisma', import.meta.url), 'utf8')
const dialogSource = pageSource.slice(pageSource.indexOf('<Dialog open={open}'))
const detailKeys = [
  'title',
  'status',
  'date',
  'time',
  'created',
  'client',
  'phone',
  'confirmedStylist',
  'service',
  'total',
  'minuteUnit',
  'clientNotes',
  'cancellationReason',
  'stylistResponses',
  'dailyLogTitle',
  'dailyLogHelp',
  'openDailyLog',
  'confirmAttendanceTitle',
  'confirmAttendanceHelp',
  'attendanceConfirming',
  'confirmAttendance',
  'attendanceConfirmed',
  'attendanceConfirmError',
  'cancelTitle',
  'cancelHelp',
  'cancelReasonPlaceholder',
  'cancelling',
  'cancelAction',
  'cancelled',
  'cancelError',
  'close',
]
const responseStatuses = ['PENDING', 'LOCKED', 'ACCEPTED', 'REJECTED']
const hasLocaleKey = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource) !== undefined

test('admin reservation detail drawer uses matching BS/EN copy', () => {
  assert.ok(dialogSource.startsWith('<Dialog open={open}'), 'Could not locate reservation detail dialog')

  const dialogKeys = detailKeys.filter(
    (key) => !['attendanceConfirmed', 'attendanceConfirmError', 'cancelled', 'cancelError'].includes(key),
  )
  for (const key of detailKeys) {
    const translationKey = `reservations.adminDetail.${key}`
    const useSite = dialogKeys.includes(key) ? dialogSource : pageSource
    assert.ok(useSite.includes(translationKey), `Detail flow does not use ${translationKey}`)
    for (const resource of locales) {
      assert.ok(hasLocaleKey(resource, translationKey), `Missing locale key: ${translationKey}`)
      assert.ok(resource.reservations.adminDetail[key], `Empty locale value: ${translationKey}`)
    }
  }

  assert.match(pageSource, /getLocalizedReservationStatusLabel\(detail\.status, detail\.cancelReason\)/)
  assert.match(pageSource, /formatLocalizedDateTime\(detail\.createdAt, i18n\.language\)/)
  assert.match(pageSource, /formatLocalizedAmount\(Number\(detail\.service\.price\), i18n\.language\)/)
})

test('stylist response statuses are localized and reservation actions retain their contracts', () => {
  assert.match(schemaSource, /status\s+String\s+\/\/ PENDING \| LOCKED \| ACCEPTED \| REJECTED/)
  assert.match(pageSource, /t\(`reservations\.adminDetail\.responseStatuses\.\$\{sr\.status\}`/)
  for (const status of responseStatuses) {
    for (const resource of locales) {
      assert.ok(
        hasLocaleKey(resource, `reservations.adminDetail.responseStatuses.${status}`),
        `Missing response-status translation: ${status}`,
      )
    }
  }

  assert.match(pageSource, /api\.post\(`\/api\/reservations\/\$\{detail\.id\}\/staff-confirm-attendance`\)/)
  assert.match(pageSource, /api\.post\(`\/api\/reservations\/\$\{detail\.id\}\/admin-cancel`, \{ cancelReason: cancelReason \|\| undefined \}\)/)
  assert.match(pageSource, /canAdminConfirmAttendance\(detail\)/)
  assert.match(pageSource, /canAdminCancelReservation\(detail\.status\)/)
})
