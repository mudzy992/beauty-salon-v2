import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./ReschedulePreviewScreen.tsx', import.meta.url), 'utf8')
const previewTranslations = resource.match(/reschedulePreview:\s*\{([\s\S]*?)\n\s*\},\n\s*directBooking:/)?.[1]

test('reschedule preview recovery messages have Bosnian resources', () => {
  assert.ok(previewTranslations, 'Missing stylist reschedule preview resources')
  for (const key of ['loadError', 'stale', 'retry']) {
    assert.match(previewTranslations, new RegExp(`\\b${key}:`), `Missing reschedule preview translation: ${key}`)
  }
})

test('reschedule preview UI copy has Bosnian resources', () => {
  assert.ok(previewTranslations, 'Missing stylist reschedule preview resources')
  for (const key of [
    'title', 'summary', 'lockedMode', 'actualOverrunMode', 'manualMode', 'breakOnlyMode',
    'manualShiftLabel', 'includeBreaksLabel', 'includeBreaksHint', 'noChangesTitle',
    'noChangesBreakOnly', 'noChangesFuture', 'serviceFallback', 'shiftLabel', 'reducedBreak',
    'confirmTitle', 'confirmMessage', 'confirmCancel', 'confirmSubmit', 'successTitle',
    'successBreakOnly', 'successNotify', 'applyBreakOnly', 'notifyClients',
  ]) {
    assert.match(previewTranslations, new RegExp(`\\b${key}:\\s*'[^']{6,}'`), `Missing meaningful reschedule preview translation: ${key}`)
  }
})

test('reschedule preview numeric copy preserves required interpolation names', () => {
  assert.match(previewTranslations, /summary:\s*'[^']*\{\{overrun\}\}[^']*\{\{totalShift\}\}/)
  assert.match(previewTranslations, /shiftLabel:\s*'[^']*\{\{minutes\}\}/)
  assert.match(previewTranslations, /reducedBreak:\s*'[^']*\{\{minutes\}\}/)
})

test('all reschedule preview resources are consumed by the screen', () => {
  for (const key of [
    'loadError', 'stale', 'retry', 'title', 'summary', 'lockedMode', 'actualOverrunMode',
    'manualMode', 'breakOnlyMode', 'manualShiftLabel', 'includeBreaksLabel', 'includeBreaksHint',
    'noChangesTitle', 'noChangesBreakOnly', 'noChangesFuture', 'serviceFallback', 'shiftLabel',
    'reducedBreak', 'confirmTitle', 'confirmMessage', 'confirmCancel', 'confirmSubmit',
    'successTitle', 'successBreakOnly', 'successNotify', 'applyBreakOnly', 'notifyClients',
  ]) {
    assert.ok(screen.includes(`stylist.reschedulePreview.${key}`), `${key} should be consumed by the screen`)
  }
})
