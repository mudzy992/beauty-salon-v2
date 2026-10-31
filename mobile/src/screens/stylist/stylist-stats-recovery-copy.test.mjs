import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const statsTranslations = resource.match(/stats:\s*\{([\s\S]*?)\n\s*\},\n\s*directBooking:/)?.[1]

test('stylist statistics recovery messages have Bosnian resources', () => {
  assert.ok(statsTranslations, 'Missing stylist statistics resources')
  for (const key of ['reservationsLoadError', 'reservationsStale', 'dailyLogLoadError', 'dailyLogStale', 'retry']) {
    assert.match(statsTranslations, new RegExp(`\\b${key}:`), `Missing statistics recovery translation: ${key}`)
  }
})
