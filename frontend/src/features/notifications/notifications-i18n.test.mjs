import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)
const source = readFileSync(new URL('../../pages/Notifications.tsx', import.meta.url), 'utf8')
const translationKeys = [...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key)
const leafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? leafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )
const getPath = (resource, key) => key.split('.').reduce((value, part) => value?.[part], resource)

test('notification page translation references have matching BS/EN resources', () => {
  for (const locale of locales) {
    for (const key of translationKeys) {
      assert.notEqual(getPath(locale, key), undefined, `Missing locale key: ${key}`)
    }
  }
  assert.deepEqual(
    leafPaths(locales[0].notifications, 'notifications').sort(),
    leafPaths(locales[1].notifications, 'notifications').sort(),
  )
  assert.match(source, /formatLocalizedDateTime\(n\.sentAt, i18n\.language\)/)
})

test('notification type and channel identifiers are displayed with localized labels', () => {
  for (const [code, key] of [
    ['RESERVATION_NEW', 'reservationNew'],
    ['RESERVATION_CONFIRMED', 'reservationConfirmed'],
    ['RESERVATION_CANCELLED', 'reservationCancelled'],
    ['RESERVATION_REMINDER', 'reservationReminder'],
    ['RESERVATION_RESCHEDULE', 'reservationReschedule'],
    ['HOLIDAY', 'holiday'],
    ['CLIENT_DEBT', 'clientDebt'],
    ['PAYMENT_RECEIPT', 'paymentReceipt'],
    ['REVIEW_NEW', 'reviewNew'],
    ['GENERAL', 'general'],
  ]) {
    assert.ok(source.includes(`case '${code}':`))
    assert.ok(source.includes(`return t('notifications.types.${key}')`))
  }
  assert.match(source, /if \(channel === 'PUSH'\) return t\('notifications\.channelPush'\)/)
  assert.match(source, /if \(channel === 'EMAIL'\) return t\('notifications\.channelEmail'\)/)
  assert.match(source, /if \(channel === 'BOTH'\) return t\('notifications\.channelBoth'\)/)
  assert.match(source, /default:\s+return type\.replace\(\/_\/g, ' '\)/)
})

test('notification API contracts, preference identifiers, and server content remain unchanged', () => {
  assert.match(source, /if \(showUnreadOnly\) params\.unreadOnly = 'true'/)
  assert.match(source, /\.get<Notification\[]>\('\/api\/notifications', \{ params \}\)/)
  assert.match(source, /\.get<NotifPreference\[]>\('\/api\/notifications\/preferences'\)/)
  assert.match(source, /\.patch\(`\/api\/notifications\/\$\{id\}\/read`\)/)
  assert.match(source, /\.post\('\/api\/notifications\/preferences', \{ type, pushEnabled, emailEnabled \}\)/)
  assert.match(source, /useSocketEvent\('notification:new'/)
  for (const type of [
    'RESERVATION_NEW',
    'RESERVATION_CONFIRMED',
    'RESERVATION_CANCELLED',
    'RESERVATION_REMINDER',
    'HOLIDAY',
    'REVIEW_NEW',
    'GENERAL',
  ]) {
    assert.ok(source.includes(`'${type}'`), `Missing unchanged preference type: ${type}`)
  }
  assert.match(source, /\{n\.title\}/)
  assert.match(source, /\{n\.body\}/)
  assert.match(source, /return type\.replace\(\/_\/g, ' '\)/)
  assert.match(source, /return channel\n/)
})
