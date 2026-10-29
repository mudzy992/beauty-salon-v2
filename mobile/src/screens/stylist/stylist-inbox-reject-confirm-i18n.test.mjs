import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./StylistInboxScreen.tsx', import.meta.url), 'utf8')
const inboxTranslations = resource.match(/inbox:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]

test('stylist inbox rejection-confirmation copy uses Bosnian resources', () => {
  assert.ok(inboxTranslations, 'Missing stylist inbox resources')
  for (const [key, copy] of [
    ['rejectConfirmTitle', 'Odbij rezervaciju'],
    ['rejectConfirmMessage', 'Želite odbiti ovu rezervaciju? Klijent će biti obaviješten.'],
    ['rejectCancel', 'Odustani'],
  ]) {
    assert.ok(inboxTranslations.includes(`${key}: '${copy}'`), `Missing rejection-confirmation resource: ${key}`)
    assert.ok(screen.includes(`t('stylist.inbox.${key}')`), `Rejection confirmation missing key: ${key}`)
  }
  assert.doesNotMatch(screen, /'Odbij rezervaciju'|'Želite odbiti ovu rezervaciju\? Klijent će biti obaviješten\.'|'Odustani'/)
})

test('rejection alert options and reservation callback remain unchanged', () => {
  assert.match(
    screen,
    /Alert\.alert\(\s*t\('stylist\.inbox\.rejectConfirmTitle'\),\s*t\('stylist\.inbox\.rejectConfirmMessage'\),\s*\[\s*\{ text: t\('stylist\.inbox\.rejectCancel'\), style: 'cancel' \},\s*\{ text: t\('stylist\.inbox\.reject'\), style: 'destructive', onPress: \(\) => doReject\(reservationId, undefined\) \},\s*\],\s*\)/,
  )
  assert.match(screen, /\},\s*\[profileId, t\],\s*\);\s*\n\s*const doReject/)
})
