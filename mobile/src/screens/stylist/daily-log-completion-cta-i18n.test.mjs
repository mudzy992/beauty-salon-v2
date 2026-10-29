import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./DailyLogDetailScreen.tsx', import.meta.url), 'utf8')
const dailyLogTranslations = resource.match(/dailyLogDetail:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]

test('daily-log completion button and completed-entry notice use Bosnian resources', () => {
  assert.ok(dailyLogTranslations, 'Missing mobile daily-log detail resources')
  for (const [key, copy] of [
    ['completeButtonWithReservation', 'Završi zapis (završava i rezervaciju)'],
    ['completeButtonStandalone', 'Završi zapis (upis u knjigu)'],
    ['completedEntryNotice', 'Kompletirani unos može mijenjati ili vratiti na čekanje samo administrator (web).'],
  ]) {
    assert.ok(dailyLogTranslations.includes(`${key}: '${copy}'`), `Missing daily-log CTA resource: ${key}`)
    assert.ok(screen.includes(`t('stylist.dailyLogDetail.${key}')`), `CTA missing translation key: ${key}`)
    assert.ok(!screen.includes(`'${copy}'`), `CTA copy remains hard-coded: ${copy}`)
  }
})

test('reservation-dependent completion copy and completion controls remain unchanged', () => {
  assert.match(
    screen,
    /title=\{\s*entry\.reservationId\s*\? t\('stylist\.dailyLogDetail\.completeButtonWithReservation'\)\s*: t\('stylist\.dailyLogDetail\.completeButtonStandalone'\)\s*\}/,
  )
  assert.match(screen, /onPress=\{handleComplete\}[\s\S]*?loading=\{acting\}/)
  assert.match(screen, /\{canComplete \? \([\s\S]*?\) : \(\s*<Text[^>]*>\s*\{t\('stylist\.dailyLogDetail\.completedEntryNotice'\)\}/)
})
