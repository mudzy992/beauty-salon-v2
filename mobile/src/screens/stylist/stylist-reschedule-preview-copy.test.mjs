import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const previewTranslations = resource.match(/reschedulePreview:\s*\{([\s\S]*?)\n\s*\},\n\s*directBooking:/)?.[1]

test('reschedule preview recovery messages have Bosnian resources', () => {
  assert.ok(previewTranslations, 'Missing stylist reschedule preview resources')
  for (const key of ['loadError', 'stale', 'retry']) {
    assert.match(previewTranslations, new RegExp(`\\b${key}:`), `Missing reschedule preview translation: ${key}`)
  }
})
