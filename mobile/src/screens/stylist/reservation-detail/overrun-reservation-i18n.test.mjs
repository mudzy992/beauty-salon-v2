import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../../i18n/bs.ts', import.meta.url), 'utf8')
const modal = readFileSync(new URL('./overrun-reservation-modal.tsx', import.meta.url), 'utf8')
const overrunTranslations = resource.match(/overrun:\s*\{([\s\S]*?)\n\s*\},\n\s*noShow:/)?.[1]

test('stylist overrun modal copy uses the Bosnian translation resources', () => {
  assert.ok(overrunTranslations, 'Missing stylist reservation-detail overrun resources')
  for (const key of [
    'title',
    'description',
    'actualOverrun',
    'manualMinutesLabel',
    'manualMinutes',
    'useShorterBreak',
  ]) {
    assert.match(overrunTranslations, new RegExp(`\\b${key}:`), `Missing overrun translation: ${key}`)
    assert.ok(modal.includes(`t('stylist.reservationDetail.overrun.${key}')`), `Modal missing key: ${key}`)
  }
  assert.ok(modal.includes("t('common.cancel')"))
  assert.doesNotMatch(modal, /Kašnjenje termina|Odaberite kako želite obraditi kašnjenje|Rekalkuliši po|Ručni unos minuta|Ne pomjeraj termine|Odustani/)
})

test('overrun choices keep their close and action callbacks', () => {
  assert.match(modal, /onClose\(\);\s*onActualOverrun\(\);/)
  assert.match(modal, /onClose\(\);\s*onManualMinutes\(\);/)
  assert.match(modal, /onClose\(\);\s*onUseBreakOnly\(\);/)
  assert.match(modal, /onChangeText=\{onManualShiftMinutesChange\}/)
})
