import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../../i18n/bs.ts', import.meta.url), 'utf8')
const actions = readFileSync(new URL('./reservation-detail-actions.tsx', import.meta.url), 'utf8')
const actionTranslations = resource.match(/actions:\s*\{([\s\S]*?)\n\s*\},\n\s*cancel:/)?.[1]

test('stylist reservation action labels use the Bosnian translation resources', () => {
  assert.ok(actionTranslations, 'Missing stylist reservation-detail action resources')
  for (const key of [
    'title',
    'confirmAttendance',
    'handleOverrun',
    'startReservation',
    'proposeReschedule',
  ]) {
    assert.match(actionTranslations, new RegExp(`\\b${key}:`), `Missing action translation: ${key}`)
    assert.ok(
      actions.includes(`t('stylist.reservationDetail.actions.${key}'`),
      `Action component missing key: ${key}`,
    )
  }
  assert.ok(actions.includes("t('stylist.reservationDetail.noShow.title')"))
  assert.ok(actions.includes("t('stylist.schedule.completeSubmit')"))
  assert.ok(actions.includes("t('stylist.schedule.cancelWithReason')"))
  assert.doesNotMatch(actions, /Potvrdi dolazak|Obradi kašnjenje termina|Startuj rezervaciju|no-show|\(reorder\)/)
})

test('reservation action visibility and callbacks remain unchanged', () => {
  assert.match(actions, /if \(!hasAnyAction\) return null/)
  assert.match(actions, /canStaffConfirm \? \(/)
  assert.match(actions, /onPress=\{onStaffConfirm\}/)
  assert.match(actions, /canStart \? \(/)
  assert.match(actions, /onPress=\{isStartOverdue \? onOpenOverrun : onStart\}/)
  assert.match(actions, /canMarkNoShow \? \(/)
  assert.match(actions, /onPress=\{onOpenNoShow\}/)
  assert.match(actions, /canCancelByStylist \? \(/)
  assert.match(actions, /onPress=\{onOpenCancel\}/)
  assert.match(actions, /onPress=\{onOpenReorder\}/)
})
