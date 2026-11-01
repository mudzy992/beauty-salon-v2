import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./StylistInboxScreen.tsx', import.meta.url), 'utf8')
const inboxTranslations = resource.match(/inbox:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]

test('stylist inbox client-debt warning copy uses Bosnian resources and interpolates details', () => {
  assert.ok(inboxTranslations, 'Missing stylist inbox resources')
  for (const [key, placeholders] of [
    ['clientDebtTitle', []],
    ['clientDebtByMe', ['{{serviceSuffix}}', '{{date}}']],
    ['clientDebtByOther', ['{{stylistName}}', '{{serviceSuffix}}', '{{date}}']],
    ['otherStylist', []],
    ['clientDebtAcceptAnyway', []],
    ['clientDebtCheckErrorTitle', []],
    ['clientDebtCheckErrorMessage', []],
    ['clientDebtContinueWithoutCheck', []],
  ]) {
    const entry = inboxTranslations.match(new RegExp(`${key}: '([^']*)'`))?.[1]
    assert.ok(entry, `Missing inbox debt-warning resource: ${key}`)
    for (const placeholder of placeholders) {
      assert.ok(entry.includes(placeholder), `Missing ${placeholder} interpolation in ${key}`)
    }
    assert.ok(screen.includes(`t('stylist.inbox.${key}'`), `Debt warning missing translation key: ${key}`)
  }
  assert.doesNotMatch(screen, /Klijent ima dugovanje kod vas|Dugovanje klijenta|'drugog stiliste'/)
})

test('debt-warning distinguishes malformed responses and keeps acceptance deliberate', () => {
  assert.ok(screen.includes('const mine = list.filter((d) => d.stylistProfileId === profileId)'))
  assert.ok(screen.includes('const others = list.filter((d) => d.stylistProfileId !== profileId)'))
  assert.ok(screen.includes('const list = normalizeClientDebts(data);'))
  assert.ok(screen.includes('if (!list) throw new Error('))
  assert.ok(screen.includes('while (!debtCheckResolved)'))
  assert.ok(screen.includes("t('stylist.inbox.clientDebtCheckErrorMessage')"))
  assert.ok(screen.includes("t('stylist.inbox.clientDebtContinueWithoutCheck')"))
  assert.ok(screen.includes("decision === 'cancel'"))
  assert.ok(screen.includes('confirmDebtWarning(lines.join('))
  assert.doesNotMatch(screen, /normalizeClientDebts\(data\) \?\? \[\]/)
  assert.ok(screen.includes('`/api/reservations/${reservation.id}/stylist/${profileId}/accept`'))
})
