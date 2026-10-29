import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../../i18n/bs.ts', import.meta.url), 'utf8')
const modal = readFileSync(new URL('./reorder-reservation-modal.tsx', import.meta.url), 'utf8')
const actions = readFileSync(
  new URL('./hooks/use-reservation-detail-actions.ts', import.meta.url),
  'utf8',
)
const reorderTranslations = resource.match(/reorder:\s*\{([\s\S]*?)\n\s*\},\n\s*noShow:/)?.[1]

test('stylist reorder modal and alerts use the Bosnian translation resources', () => {
  assert.ok(reorderTranslations, 'Missing stylist reservation-detail reorder resources')
  for (const key of [
    'title',
    'description',
    'newStart',
    'newEnd',
    'preview',
    'emptyPreview',
    'sendToClient',
    'invalidTime',
    'sentTitle',
    'sentMessage',
    'errorFallback',
  ]) {
    assert.match(reorderTranslations, new RegExp(`\\b${key}:`), `Missing reorder translation: ${key}`)
  }
  for (const key of ['title', 'description', 'newStart', 'newEnd', 'sendToClient']) {
    assert.ok(modal.includes(`t('stylist.reservationDetail.reorder.${key}'`), `Modal missing key: ${key}`)
  }
  assert.ok(modal.includes("t('stylist.reservationDetail.reorder.preview'"))
  assert.ok(modal.includes("t('stylist.reservationDetail.reorder.emptyPreview')"))
  for (const key of ['invalidTime', 'sentTitle', 'sentMessage', 'errorFallback']) {
    assert.ok(actions.includes(`t('stylist.reservationDetail.reorder.${key}'`), `Action missing key: ${key}`)
  }
  assert.ok(modal.includes("t('common.cancel')"))
  assert.doesNotMatch(modal, /Reorder termina|Odaberite novo vrijeme|Novi početak|Novi kraj|Pošalji klijentu/)
  assert.doesNotMatch(actions, /'Odaberite valjan početak i kraj \(HH:mm\)\.'|'Poslano'|'Klijentu je poslan prijedlog pomjeranja termina\.'/)
})

test('reorder retains time validation, request fields and modal reset behavior', () => {
  assert.match(actions, /const start = normalizeHm\(reorderStartTime\)/)
  assert.match(actions, /const end = normalizeHm\(reorderEndTime\)/)
  assert.match(actions, /parseHmToMinutes\(end\)[\s\S]*parseHmToMinutes\(start\)/)
  assert.match(actions, /\/reorder\/request/)
  assert.match(actions, /targetStartTime: start,\s*targetEndTime: end/)
  assert.match(actions, /setReorderModalOpen\(false\)/)
  assert.match(actions, /setReorderStartTime\(''\)/)
  assert.match(actions, /setReorderEndTime\(''\)/)
  assert.match(modal, /onPress=\{onSubmit\}/)
})
