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
  ]) {
    const entry = inboxTranslations.match(new RegExp(`${key}: '([^']*)'`))?.[1]
    assert.ok(entry, `Missing inbox debt-warning resource: ${key}`)
    for (const placeholder of placeholders) {
      assert.ok(entry.includes(placeholder), `Missing ${placeholder} interpolation in ${key}`)
    }
    assert.ok(screen.includes(`t('stylist.inbox.${key}'`), `Debt warning missing translation key: ${key}`)
  }
  assert.doesNotMatch(screen, /Klijent ima dugovanje kod vas|Klijent ima dugovanje kod \$\{stylistName\}|Dugovanje klijenta|'drugog stiliste'/)
})

test('debt-warning filters, optional data, and acceptance behavior remain unchanged', () => {
  assert.match(screen, /const mine = list\.filter\(\(d\) => d\.stylistProfileId === profileId\)/)
  assert.match(screen, /const others = list\.filter\(\(d\) => d\.stylistProfileId !== profileId\)/)
  assert.match(screen, /if \(mine\.length > 0\)[\s\S]*?first\.createdAt\.slice\(0, 10\)/)
  assert.match(screen, /if \(others\.length > 0\)[\s\S]*?d\.createdAt\.slice\(0, 10\)/)
  assert.match(screen, /if \(lines\.length > 0\) Alert\.alert\(t\('stylist\.inbox\.clientDebtTitle'\), lines\.join\('\\n'\)\)/)
  assert.match(screen, /await api\.post\(`\/api\/reservations\/\$\{reservation\.id\}\/stylist\/\$\{profileId\}\/accept`\)/)
})
