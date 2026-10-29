import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../../i18n/bs.ts', import.meta.url), 'utf8')
const modal = readFileSync(new URL('./no-show-reservation-modal.tsx', import.meta.url), 'utf8')
const actions = readFileSync(
  new URL('./hooks/use-reservation-detail-actions.ts', import.meta.url),
  'utf8',
)
const noShowTranslations = resource.match(/noShow:\s*\{([\s\S]*?)\n\s*\},/)?.[1]

test('stylist no-show modal and action use the Bosnian translation resources', () => {
  assert.ok(noShowTranslations, 'Missing stylist reservation-detail no-show resources')
  for (const key of [
    'title',
    'reasonLabel',
    'reasonPlaceholder',
    'penalty',
    'confirm',
    'reasonRequired',
    'markedTitle',
    'markedMessage',
    'errorFallback',
  ]) {
    assert.match(noShowTranslations, new RegExp(`\\b${key}:`), `Missing no-show translation: ${key}`)
  }

  for (const key of ['title', 'reasonLabel', 'reasonPlaceholder', 'penalty', 'confirm']) {
    assert.ok(modal.includes(`t('stylist.reservationDetail.noShow.${key}'`), `Modal missing key: ${key}`)
  }
  for (const key of ['reasonRequired', 'markedTitle', 'markedMessage', 'errorFallback']) {
    assert.ok(actions.includes(`t('stylist.reservationDetail.noShow.${key}')`), `Action missing key: ${key}`)
  }
  assert.ok(modal.includes("t(applyPenalty ? 'common.yes' : 'common.no')"))
  assert.doesNotMatch(modal, /Klijent se nije pojavio|Obrazloženje|Penal: DA|Penal: NE|Označi no-show/)
  assert.doesNotMatch(actions, /'Unesite obrazloženje\.'|'Označeno'|'Rezervacija je označena kao no-show\.'/)
})

test('no-show submission keeps reason validation and request semantics', () => {
  assert.match(actions, /const reason = noShowReason\.trim\(\)/)
  assert.match(actions, /if \(!reason\)\s*\{[\s\S]*noShow\.reasonRequired/)
  assert.match(actions, /\/stylist-no-show/)
  assert.match(actions, /reason,\s*applyPenalty: noShowApplyPenalty/)
  assert.match(actions, /setNoShowModalOpen\(false\)/)
  assert.match(actions, /setNoShowSubmitting\(false\)/)
})
