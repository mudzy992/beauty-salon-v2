import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./StylistInboxScreen.tsx', import.meta.url), 'utf8')
const inboxTranslations = resource.match(/inbox:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]

test('stylist inbox other-stylist lock hint uses a Bosnian resource', () => {
  assert.ok(inboxTranslations, 'Missing stylist inbox resources')
  assert.ok(
    inboxTranslations.includes("lockedByOtherMessage: 'Drugi stilist trenutno razmatra ovaj zahtjev.'"),
    'Missing other-stylist lock hint resource',
  )
  assert.ok(screen.includes("t('stylist.inbox.lockedByOtherMessage')"), 'Lock hint missing translation key')
  assert.doesNotMatch(screen, /Drugi stilist trenutno razmatra ovaj zahtjev\./)
})

test('lock hint condition and lock/accept restrictions remain unchanged', () => {
  assert.match(
    screen,
    /const lockedByOther =\s*item\.status === 'STYLIST_REVIEW' &&\s*!isLockedByMe &&\s*\(item\.stylistResponses \?\? \[\]\)\.some\(/,
  )
  assert.match(screen, /\{lockedByOther \? \([\s\S]*?t\('stylist\.inbox\.lockedByOtherMessage'\)/)
  assert.match(screen, /!lockedByOther &&[\s\S]*?const canAccept = !lockedByOther/)
})
