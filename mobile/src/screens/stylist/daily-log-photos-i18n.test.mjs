import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./DailyLogDetailScreen.tsx', import.meta.url), 'utf8')
const dailyLogTranslations = resource.match(/dailyLogDetail:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]

const labels = [
  ['photosSectionTitle', 'Prije i poslije'],
  ['beforePhotosLabel', 'Prije'],
  ['afterPhotosLabel', 'Poslije'],
  ['addPhotosHint', 'Dodajte prije/poslije fotografije preko menija akcija (⋯).'],
]

test('daily-log before-and-after photo section uses Bosnian resources', () => {
  assert.ok(dailyLogTranslations, 'Missing mobile daily-log detail resources')
  for (const [key, copy] of labels) {
    assert.ok(dailyLogTranslations.includes(`${key}: '${copy}'`), `Missing photo section resource: ${key}`)
    assert.ok(screen.includes(`t('stylist.dailyLogDetail.${key}')`), `Photo section missing translation key: ${key}`)
    assert.ok(!screen.includes(`>${copy}<`), `Photo section copy remains hard-coded: ${copy}`)
  }
})

test('photo visibility conditions and image rendering remain unchanged', () => {
  assert.match(screen, /\{\(canComplete \|\| hasBeforeAfter\) && \(\s*<Card[\s\S]*?photosSectionTitle/)
  assert.match(screen, /\{beforeImages\.length > 0 && \([\s\S]*?beforePhotosLabel[\s\S]*?beforeImages\.map\(/)
  assert.match(screen, /\{afterImages\.length > 0 && \([\s\S]*?afterPhotosLabel[\s\S]*?afterImages\.map\(/)
  assert.match(screen, /\{canComplete && !hasBeforeAfter \? \([\s\S]*?addPhotosHint/)
})
